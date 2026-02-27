import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/db/mongodb';
import { computeHealthScoresForUsers } from '@/lib/services/healthScore';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const riskFilter = searchParams.get('risk') || 'all';

    const client = await clientPromise;
    const db = client.db();

    // For summary counts, sample users to compute risk distribution
    // Use a larger batch for accurate summary stats
    const totalUsers = await db.collection('users').countDocuments();
    const SAMPLE_SIZE = Math.min(totalUsers, 200);

    const sampleUsers = await db.collection('users')
      .find({})
      .project({ _id: 1 })
      .limit(SAMPLE_SIZE)
      .toArray();

    const sampleIds = sampleUsers.map((u) => u._id.toString());
    const sampleScores = await computeHealthScoresForUsers(sampleIds);

    // Count risk levels from sample
    let sampleHealthy = 0;
    let sampleAtRisk = 0;
    let sampleChurning = 0;
    for (const result of sampleScores.values()) {
      if (result.riskLevel === 'healthy') sampleHealthy++;
      else if (result.riskLevel === 'at-risk') sampleAtRisk++;
      else sampleChurning++;
    }

    // Extrapolate to full user base
    const scaleFactor = totalUsers / (SAMPLE_SIZE || 1);
    const summary = {
      healthy: Math.round(sampleHealthy * scaleFactor),
      atRisk: Math.round(sampleAtRisk * scaleFactor),
      churning: Math.round(sampleChurning * scaleFactor),
      total: totalUsers,
    };

    // For the paginated user list, we need to handle risk filtering
    // If filtering by risk level, we fetch a larger batch and filter post-computation
    if (riskFilter !== 'all') {
      // Fetch more users than needed so we can filter after scoring
      const fetchSize = limit * 5;
      const skip = (page - 1) * limit;

      // We need to iterate through users in batches to find enough matching risk level
      // eslint-disable-next-line prefer-const
      let matchedUsers: Array<{
        _id: string;
        name: string;
        email: string;
        subscriptionTier: string;
        createdAt: Date;
        health: ReturnType<typeof Object.fromEntries> extends never ? never : unknown;
      }> = [];
      let cursor = 0;
      let totalMatched = 0;
      let scannedAll = false;

      while (matchedUsers.length < skip + limit && !scannedAll) {
        const batch = await db.collection('users')
          .find({})
          .project({
            password: 0,
            resetPasswordToken: 0,
            resetPasswordExpires: 0,
          })
          .sort({ createdAt: -1 })
          .skip(cursor)
          .limit(fetchSize)
          .toArray();

        if (batch.length === 0) {
          scannedAll = true;
          break;
        }

        const batchIds = batch.map((u) => u._id.toString());
        const batchScores = await computeHealthScoresForUsers(batchIds);

        for (const user of batch) {
          const healthResult = batchScores.get(user._id.toString());
          if (healthResult && healthResult.riskLevel === riskFilter) {
            totalMatched++;
            matchedUsers.push({
              _id: user._id.toString(),
              name: user.name,
              email: user.email,
              subscriptionTier: user.subscriptionTier || 'Free',
              createdAt: user.createdAt,
              health: healthResult,
            });
          }
        }

        cursor += fetchSize;
        if (batch.length < fetchSize) scannedAll = true;
      }

      // Apply pagination to matched results
      const paginatedUsers = matchedUsers.slice(skip, skip + limit);

      return NextResponse.json({
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          total: scannedAll ? totalMatched : totalMatched, // best estimate
          totalPages: Math.ceil(totalMatched / limit) || 1,
        },
        summary,
      });
    }

    // No risk filter: standard pagination
    const [users, total] = await Promise.all([
      db.collection('users')
        .find({})
        .project({
          password: 0,
          resetPasswordToken: 0,
          resetPasswordExpires: 0,
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      db.collection('users').countDocuments(),
    ]);

    // Compute health scores for this page of users
    const userIds = users.map((u) => u._id.toString());
    const healthScores = await computeHealthScoresForUsers(userIds);

    const usersWithHealth = users.map((user) => ({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      subscriptionTier: user.subscriptionTier || 'Free',
      createdAt: user.createdAt,
      health: healthScores.get(user._id.toString()) || null,
    }));

    return NextResponse.json({
      users: usersWithHealth,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    });
  } catch (error) {
    console.error('Error fetching user health scores:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
