import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess } from '@/lib/api/withApiAuth';
import { ApiUsage } from '@/models/ApiUsage';
import { getCurrentPeriod, getEffectiveRateLimits } from '@/lib/ratelimit/rateLimitApi';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * GET /api/v1/usage
 * Returns the current billing period usage for the authenticated API key.
 */
async function handler(request: NextRequest, context: ApiAuthContext, requestId: string) {
  await dbConnect();

  const { periodStart, periodEnd } = getCurrentPeriod();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usage: any = await ApiUsage.findOne({
    apiKeyId: context.apiKey._id,
    periodStart,
  }).lean();

  const limits = getEffectiveRateLimits(
    context.keyType,
    context.apiTier,
    context.apiKey.customRateLimits
  );

  return apiSuccess({
    keyType: context.keyType,
    apiTier: context.apiTier,
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    },
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
  }, { requestId });
}

export const GET = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
});
