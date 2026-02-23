import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { StudySession } from '@/models/StudySession';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { User } from '@/models/User';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(session.user.id);

  // Get user's profile
  const user = await User.findById(userId).select('profiles').lean();
  const profileId = (user as { profiles?: mongoose.Types.ObjectId[] })?.profiles?.[0];

  let totalSessions = 0;
  let totalTimeStudied = 0;
  let overallAccuracy = 0;

  if (profileId) {
    // Aggregate from StudyAnalytics
    const analyticsAgg = await StudyAnalytics.aggregate([
      { $match: { profile: profileId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: '$setPerformance.totalStudySessions' },
          totalTime: { $sum: '$setPerformance.totalTimeStudied' },
          weightedScore: {
            $sum: {
              $multiply: [
                '$setPerformance.averageScore',
                '$setPerformance.totalStudySessions',
              ],
            },
          },
          totalWeight: { $sum: '$setPerformance.totalStudySessions' },
        },
      },
    ]);

    if (analyticsAgg.length > 0) {
      const agg = analyticsAgg[0];
      totalSessions = agg.totalSessions;
      totalTimeStudied = agg.totalTime;
      overallAccuracy =
        agg.totalWeight > 0
          ? Math.round(agg.weightedScore / agg.totalWeight)
          : 0;
    }
  }

  // Calculate streak: consecutive days with at least one completed session
  const streak = await calculateStreak(userId);

  // Today's sessions
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todaySessions = await StudySession.countDocuments({
    userId,
    status: 'completed',
    startTime: { $gte: startOfDay },
  });

  return NextResponse.json({
    totalSessions,
    totalTimeStudied,
    overallAccuracy,
    streak,
    todaySessions,
  });
}

async function calculateStreak(userId: mongoose.Types.ObjectId): Promise<number> {
  // Get distinct dates with completed sessions, most recent first
  const result = await StudySession.aggregate([
    { $match: { userId, status: 'completed' } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$startTime' },
        },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 365 },
  ]);

  if (result.length === 0) return 0;

  const dates = result.map((r) => r._id as string);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Check if the most recent session is today or yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
    return 0; // Streak broken
  }

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const expected = new Date(dates[i - 1]);
    expected.setDate(expected.getDate() - 1);
    const expectedStr = expected.toISOString().split('T')[0];

    if (dates[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
