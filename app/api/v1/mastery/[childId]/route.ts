import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { MasteryRollup } from '@/models/MasteryRollup';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

async function handler(request: NextRequest, context: ApiAuthContext, requestId: string) {
  const childId = decodeURIComponent(request.nextUrl.pathname.split('/').pop() ?? '').trim();
  if (!childId) {
    return apiError('INVALID_INPUT', requestId, undefined, 'childId path param is required.');
  }

  await dbConnect();

  const rollups = await MasteryRollup.find({
    apiKeyId: context.apiKey._id,
    childId,
  }).lean<Array<{
    framework: string;
    code: string;
    state: 'exposed' | 'practiced' | 'demonstrated';
    firstAttemptCorrectRate: number;
    attemptCount: number;
    lastAttemptAt?: Date;
  }>>();

  if (rollups.length === 0) {
    return apiError('NOT_FOUND', requestId, undefined, `No mastery data for child ${childId}.`);
  }

  return apiSuccess({
    childId,
    standards: rollups.map((r) => ({
      framework: r.framework,
      code: r.code,
      state: r.state,
      firstAttemptCorrectRate: r.firstAttemptCorrectRate,
      attemptCount: r.attemptCount,
      lastAttemptAt: r.lastAttemptAt ? r.lastAttemptAt.toISOString() : null,
    })),
  }, { requestId });
}

export const GET = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'ecosystem'],
  requiredPermission: 'mastery:read',
});
