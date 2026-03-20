import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';
import { ApiUsage } from '@/models/ApiUsage';
import { ApiLog } from '@/models/ApiLog';
import { getCurrentPeriod, getEffectiveRateLimits } from '@/lib/ratelimit/rateLimitApi';

const secret = process.env.NEXTAUTH_SECRET;

/**
 * GET /api/developer/usage
 * Returns usage stats for the authenticated user's API keys.
 * Query params: keyId (optional, filter to a specific key)
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const url = request.nextUrl;
  const keyId = url.searchParams.get('keyId');
  const period = url.searchParams.get('period') || 'current'; // 'current' or 'history'

  const { periodStart, periodEnd } = getCurrentPeriod();

  // Get user's keys
  const keyFilter: Record<string, unknown> = { userId: token.id };
  if (keyId) keyFilter._id = keyId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keys: any[] = await ApiKey.find(keyFilter)
    .select('_id name keyType keyPrefix apiTier status customRateLimits')
    .lean();

  if (keys.length === 0) {
    return NextResponse.json({
      keys: [],
      currentPeriod: { start: periodStart, end: periodEnd },
      usage: [],
    });
  }

  const keyIds = keys.map(k => k._id);

  if (period === 'history') {
    // Get last 6 months of usage
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history: any[] = await ApiUsage.find({
      apiKeyId: { $in: keyIds },
      periodStart: { $gte: sixMonthsAgo },
    })
      .sort({ periodStart: -1 })
      .lean();

    return NextResponse.json({
      keys: keys.map(k => ({
        id: String(k._id),
        name: k.name,
        keyType: k.keyType,
        keyPrefix: k.keyPrefix,
        apiTier: k.apiTier,
      })),
      history: history.map(h => ({
        keyId: String(h.apiKeyId),
        periodStart: h.periodStart,
        periodEnd: h.periodEnd,
        apiCalls: h.apiCalls,
        generationCalls: h.generationCalls,
        overageCalls: h.overageCalls,
      })),
    });
  }

  // Current period usage per key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usageRecords: any[] = await ApiUsage.find({
    apiKeyId: { $in: keyIds },
    periodStart,
  }).lean();

  // Recent activity (last 24h call count per key)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentActivity = await ApiLog.aggregate([
    {
      $match: {
        apiKeyId: { $in: keyIds },
        timestamp: { $gte: twentyFourHoursAgo },
      },
    },
    {
      $group: {
        _id: '$apiKeyId',
        calls24h: { $sum: 1 },
        avgResponseMs: { $avg: '$responseTimeMs' },
      },
    },
  ]);

  // Build per-key usage summary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usageMap = new Map(usageRecords.map((u: any) => [String(u.apiKeyId), u]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activityMap = new Map(recentActivity.map((a: any) => [String(a._id), a]));

  const keySummaries = keys.map(k => {
    const id = String(k._id);
    const usage = usageMap.get(id);
    const activity = activityMap.get(id);
    const limits = getEffectiveRateLimits(k.keyType, k.apiTier, k.customRateLimits);

    return {
      id,
      name: k.name,
      keyType: k.keyType,
      keyPrefix: k.keyPrefix,
      apiTier: k.apiTier,
      status: k.status,
      usage: {
        apiCalls: usage?.apiCalls || 0,
        generationCalls: usage?.generationCalls || 0,
        overageCalls: usage?.overageCalls || 0,
      },
      limits: {
        burstPerMinute: isFinite(limits.burstPerMinute) ? limits.burstPerMinute : null,
        monthlyGenerations: isFinite(limits.monthlyGenerations) ? limits.monthlyGenerations : null,
        monthlyApiCalls: isFinite(limits.monthlyApiCalls) ? limits.monthlyApiCalls : null,
      },
      activity24h: {
        calls: activity?.calls24h || 0,
        avgResponseMs: activity ? Math.round(activity.avgResponseMs) : 0,
      },
    };
  });

  return NextResponse.json({
    currentPeriod: { start: periodStart, end: periodEnd },
    keys: keySummaries,
  });
}
