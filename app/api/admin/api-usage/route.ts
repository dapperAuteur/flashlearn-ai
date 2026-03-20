import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';
import { ApiUsage } from '@/models/ApiUsage';
import { ApiLog } from '@/models/ApiLog';

const secret = process.env.NEXTAUTH_SECRET;

/**
 * GET /api/admin/api-usage
 * Aggregated API usage dashboard data for admin.
 * Returns: overview stats, usage by key type, top users, recent activity.
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await dbConnect();

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    keyCountsByType,
    keyCountsByStatus,
    currentMonthUsageByType,
    recentApiCalls24h,
    recentGenerations24h,
    topUsersByUsage,
    dailyCallsLast7Days,
    topEndpoints,
  ] = await Promise.all([
    // Active keys by type
    ApiKey.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$keyType', count: { $sum: 1 } } },
    ]),

    // Keys by status
    ApiKey.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // Current month usage by key type
    ApiUsage.aggregate([
      { $match: { periodStart: { $gte: currentMonthStart } } },
      {
        $group: {
          _id: '$keyType',
          totalApiCalls: { $sum: '$apiCalls' },
          totalGenerations: { $sum: '$generationCalls' },
          totalOverage: { $sum: '$overageCalls' },
        },
      },
    ]),

    // Total API calls in last 24h
    ApiLog.countDocuments({ timestamp: { $gte: twentyFourHoursAgo } }),

    // Total generation calls in last 24h
    ApiLog.countDocuments({
      timestamp: { $gte: twentyFourHoursAgo },
      endpoint: { $regex: /generate/ },
    }),

    // Top users by API calls this month
    ApiUsage.aggregate([
      { $match: { periodStart: { $gte: currentMonthStart } } },
      {
        $group: {
          _id: '$userId',
          totalApiCalls: { $sum: '$apiCalls' },
          totalGenerations: { $sum: '$generationCalls' },
        },
      },
      { $sort: { totalApiCalls: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          totalApiCalls: 1,
          totalGenerations: 1,
          userName: '$user.name',
          userEmail: '$user.email',
        },
      },
    ]),

    // Daily API calls for last 7 days
    ApiLog.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            keyType: '$keyType',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),

    // Top endpoints by call count
    ApiLog.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { endpoint: '$endpoint', method: '$method' },
          count: { $sum: 1 },
          avgResponseMs: { $avg: '$responseTimeMs' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  // Build response
  const keysByType: Record<string, number> = {};
  keyCountsByType.forEach((k: { _id: string; count: number }) => {
    keysByType[k._id] = k.count;
  });

  const keysByStatus: Record<string, number> = {};
  keyCountsByStatus.forEach((k: { _id: string; count: number }) => {
    keysByStatus[k._id] = k.count;
  });

  const usageByType: Record<string, { apiCalls: number; generations: number; overage: number }> = {};
  currentMonthUsageByType.forEach((u: { _id: string; totalApiCalls: number; totalGenerations: number; totalOverage: number }) => {
    usageByType[u._id] = {
      apiCalls: u.totalApiCalls,
      generations: u.totalGenerations,
      overage: u.totalOverage,
    };
  });

  return NextResponse.json({
    overview: {
      totalActiveKeys: Object.values(keysByType).reduce((a, b) => a + b, 0),
      keysByType,
      keysByStatus,
      apiCalls24h: recentApiCalls24h,
      generations24h: recentGenerations24h,
    },
    currentMonth: {
      period: {
        start: currentMonthStart.toISOString(),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      },
      usageByType,
    },
    topUsers: topUsersByUsage,
    dailyCalls: dailyCallsLast7Days,
    topEndpoints: topEndpoints.map((e: { _id: { endpoint: string; method: string }; count: number; avgResponseMs: number }) => ({
      endpoint: e._id.endpoint,
      method: e._id.method,
      count: e.count,
      avgResponseMs: Math.round(e.avgResponseMs),
    })),
  });
}
