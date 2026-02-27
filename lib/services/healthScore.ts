import clientPromise from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';

export interface HealthScoreResult {
  score: number;
  riskLevel: 'healthy' | 'at-risk' | 'churning';
  factors: {
    loginRecency: number;
    studyFrequency: number;
    contentCreation: number;
    engagementDepth: number;
    subscriptionStatus: number;
  };
  details: {
    daysSinceLastLogin: number;
    studySessionsLast30d: number;
    setsCreatedLast30d: number;
    avgAccuracy: number;
    subscriptionTier: string;
  };
}

// Weights for each factor
const WEIGHTS = {
  loginRecency: 0.25,
  studyFrequency: 0.30,
  contentCreation: 0.20,
  engagementDepth: 0.15,
  subscriptionStatus: 0.10,
};

function scoreLoginRecency(daysSinceLastLogin: number): number {
  if (daysSinceLastLogin === 0) return 100;
  if (daysSinceLastLogin <= 3) return 90;
  if (daysSinceLastLogin <= 7) return 70;
  if (daysSinceLastLogin <= 14) return 50;
  if (daysSinceLastLogin <= 30) return 25;
  return 0;
}

function scoreStudyFrequency(sessionsLast30d: number): number {
  if (sessionsLast30d >= 20) return 100;
  if (sessionsLast30d >= 10) return 80;
  if (sessionsLast30d >= 5) return 60;
  if (sessionsLast30d >= 1) return 30;
  return 0;
}

function scoreContentCreation(setsCreatedLast30d: number): number {
  if (setsCreatedLast30d >= 5) return 100;
  if (setsCreatedLast30d >= 3) return 80;
  if (setsCreatedLast30d >= 1) return 50;
  return 0;
}

function scoreEngagementDepth(avgAccuracy: number): number {
  if (avgAccuracy >= 80) return 100;
  if (avgAccuracy >= 60) return 70;
  if (avgAccuracy >= 40) return 40;
  return 10;
}

function scoreSubscription(tier: string): number {
  switch (tier) {
    case 'Lifetime Learner': return 100;
    case 'Annual Pro': return 90;
    case 'Monthly Pro': return 70;
    case 'Free': return 20;
    default: return 20;
  }
}

function getRiskLevel(score: number): 'healthy' | 'at-risk' | 'churning' {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'at-risk';
  return 'churning';
}

export async function computeHealthScore(userId: string): Promise<HealthScoreResult> {
  const client = await clientPromise;
  const db = client.db();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch user subscription tier
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { subscriptionTier: 1, profiles: 1 } }
  );

  const subscriptionTier = user?.subscriptionTier || 'Free';
  const profileIds: ObjectId[] = (user?.profiles || []).map((id: ObjectId | string) =>
    typeof id === 'string' ? new ObjectId(id) : id
  );

  // Run all queries in parallel for performance
  const [lastLoginDoc, studySessions, setsCreatedCount, accuracyResult] = await Promise.all([
    // 1. Login recency: most recent login from auth_logs
    db.collection('auth_logs').findOne(
      { userId: userId, event: 'login', status: 'success' },
      { sort: { timestamp: -1 }, projection: { timestamp: 1 } }
    ),

    // 2. Study frequency: count study sessions in last 30 days
    db.collection('studySessions').countDocuments({
      userId: new ObjectId(userId),
      startTime: { $gte: thirtyDaysAgo },
    }),

    // 3. Content creation: count flashcard sets created in last 30 days
    // FlashcardSets are linked to profiles, not directly to users
    profileIds.length > 0
      ? db.collection('flashcard_sets').countDocuments({
          profile: { $in: profileIds },
          createdAt: { $gte: thirtyDaysAgo },
        })
      : Promise.resolve(0),

    // 4. Engagement depth: average accuracy from study sessions
    db.collection('studySessions').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          status: 'completed',
          $expr: { $gt: [{ $add: ['$correctCount', '$incorrectCount'] }, 0] },
        },
      },
      {
        $group: {
          _id: null,
          avgAccuracy: {
            $avg: {
              $multiply: [
                { $divide: ['$correctCount', { $add: ['$correctCount', '$incorrectCount'] }] },
                100,
              ],
            },
          },
        },
      },
    ]).toArray(),
  ]);

  // Calculate days since last login
  let daysSinceLastLogin = 999;
  if (lastLoginDoc?.timestamp) {
    const lastLoginDate = new Date(lastLoginDoc.timestamp);
    daysSinceLastLogin = Math.floor((now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const avgAccuracy = accuracyResult.length > 0 ? Math.round(accuracyResult[0].avgAccuracy) : 0;

  // Calculate individual factor scores
  const factors = {
    loginRecency: scoreLoginRecency(daysSinceLastLogin),
    studyFrequency: scoreStudyFrequency(studySessions),
    contentCreation: scoreContentCreation(setsCreatedCount),
    engagementDepth: scoreEngagementDepth(avgAccuracy),
    subscriptionStatus: scoreSubscription(subscriptionTier),
  };

  // Calculate weighted total score
  const score = Math.round(
    factors.loginRecency * WEIGHTS.loginRecency +
    factors.studyFrequency * WEIGHTS.studyFrequency +
    factors.contentCreation * WEIGHTS.contentCreation +
    factors.engagementDepth * WEIGHTS.engagementDepth +
    factors.subscriptionStatus * WEIGHTS.subscriptionStatus
  );

  return {
    score,
    riskLevel: getRiskLevel(score),
    factors,
    details: {
      daysSinceLastLogin,
      studySessionsLast30d: studySessions,
      setsCreatedLast30d: setsCreatedCount,
      avgAccuracy,
      subscriptionTier,
    },
  };
}

export async function computeHealthScoresForUsers(
  userIds: string[]
): Promise<Map<string, HealthScoreResult>> {
  if (userIds.length === 0) return new Map();

  const client = await clientPromise;
  const db = client.db();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const objectIds = userIds.map((id) => new ObjectId(id));

  // Fetch all users with their profiles and subscription tiers
  const users = await db.collection('users').find(
    { _id: { $in: objectIds } },
    { projection: { subscriptionTier: 1, profiles: 1 } }
  ).toArray();

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  // Collect all profile IDs across all users
  const allProfileIds: ObjectId[] = [];
  const userProfileMap = new Map<string, ObjectId[]>();

  for (const user of users) {
    const profileIds = (user.profiles || []).map((id: ObjectId | string) =>
      typeof id === 'string' ? new ObjectId(id) : id
    );
    userProfileMap.set(user._id.toString(), profileIds);
    allProfileIds.push(...profileIds);
  }

  // Run all batch queries in parallel
  const [lastLogins, studySessionCounts, setCreationCounts, accuracyResults] = await Promise.all([
    // 1. Last login per user from auth_logs
    db.collection('auth_logs').aggregate([
      {
        $match: {
          userId: { $in: userIds },
          event: 'login',
          status: 'success',
        },
      },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$userId',
          lastLogin: { $first: '$timestamp' },
        },
      },
    ]).toArray(),

    // 2. Study session counts per user in last 30 days
    db.collection('studySessions').aggregate([
      {
        $match: {
          userId: { $in: objectIds },
          startTime: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
        },
      },
    ]).toArray(),

    // 3. Flashcard sets created per profile in last 30 days
    allProfileIds.length > 0
      ? db.collection('flashcard_sets').aggregate([
          {
            $match: {
              profile: { $in: allProfileIds },
              createdAt: { $gte: thirtyDaysAgo },
            },
          },
          {
            $group: {
              _id: '$profile',
              count: { $sum: 1 },
            },
          },
        ]).toArray()
      : Promise.resolve([]),

    // 4. Average accuracy per user from completed study sessions
    db.collection('studySessions').aggregate([
      {
        $match: {
          userId: { $in: objectIds },
          status: 'completed',
          $expr: { $gt: [{ $add: ['$correctCount', '$incorrectCount'] }, 0] },
        },
      },
      {
        $group: {
          _id: '$userId',
          avgAccuracy: {
            $avg: {
              $multiply: [
                { $divide: ['$correctCount', { $add: ['$correctCount', '$incorrectCount'] }] },
                100,
              ],
            },
          },
        },
      },
    ]).toArray(),
  ]);

  // Build lookup maps
  const loginMap = new Map(
    lastLogins.map((r) => [r._id, new Date(r.lastLogin)])
  );

  const sessionCountMap = new Map(
    studySessionCounts.map((r) => [r._id.toString(), r.count as number])
  );

  // Map profile set counts back to users
  const profileSetCountMap = new Map(
    setCreationCounts.map((r) => [r._id.toString(), r.count as number])
  );

  const accuracyMap = new Map(
    accuracyResults.map((r) => [r._id.toString(), Math.round(r.avgAccuracy as number)])
  );

  // Compute health scores for each user
  const results = new Map<string, HealthScoreResult>();

  for (const userId of userIds) {
    const user = userMap.get(userId);
    const subscriptionTier = user?.subscriptionTier || 'Free';

    // Days since last login
    let daysSinceLastLogin = 999;
    const lastLogin = loginMap.get(userId);
    if (lastLogin) {
      daysSinceLastLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Study sessions count
    const studySessions = sessionCountMap.get(userId) || 0;

    // Sets created: sum across all user profiles
    const profileIds = userProfileMap.get(userId) || [];
    let setsCreatedCount = 0;
    for (const profileId of profileIds) {
      setsCreatedCount += profileSetCountMap.get(profileId.toString()) || 0;
    }

    // Average accuracy
    const avgAccuracy = accuracyMap.get(userId) || 0;

    // Calculate factor scores
    const factors = {
      loginRecency: scoreLoginRecency(daysSinceLastLogin),
      studyFrequency: scoreStudyFrequency(studySessions),
      contentCreation: scoreContentCreation(setsCreatedCount),
      engagementDepth: scoreEngagementDepth(avgAccuracy),
      subscriptionStatus: scoreSubscription(subscriptionTier),
    };

    const score = Math.round(
      factors.loginRecency * WEIGHTS.loginRecency +
      factors.studyFrequency * WEIGHTS.studyFrequency +
      factors.contentCreation * WEIGHTS.contentCreation +
      factors.engagementDepth * WEIGHTS.engagementDepth +
      factors.subscriptionStatus * WEIGHTS.subscriptionStatus
    );

    results.set(userId, {
      score,
      riskLevel: getRiskLevel(score),
      factors,
      details: {
        daysSinceLastLogin,
        studySessionsLast30d: studySessions,
        setsCreatedLast30d: setsCreatedCount,
        avgAccuracy,
        subscriptionTier,
      },
    });
  }

  return results;
}
