import { NextRequest } from 'next/server';
import type { Types } from 'mongoose';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { purgeChildData, hasPriorPurge } from '@/lib/api/cascadeDelete';
import { cancelQStashMessage } from '@/lib/qstash/client';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

// COPPA cascade-delete. Idempotent:
//   first call with data        → 200 + count
//   first call with no data     → 404
//   re-call after a prior purge → 200 with purgedRecordCount: 0
//
// We never charge developers for invoking a privacy right, so this route is
// not flagged as a generation route and does not increment the generations
// counter (it still counts as 1 API call via withApiAuth's default).
async function handler(request: NextRequest, context: ApiAuthContext, requestId: string) {
  const childId = decodeURIComponent(request.nextUrl.pathname.split('/').pop() ?? '').trim();
  if (!childId) {
    return apiError('INVALID_INPUT', requestId, undefined, 'childId path param is required.');
  }

  await dbConnect();

  const priorPurge = await hasPriorPurge(context.apiKey._id as Types.ObjectId, childId);

  const requesterIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '';

  const result = await purgeChildData(
    context.apiKey._id as Types.ObjectId,
    childId,
    { requestId, requesterIp },
    { cancelQStashMessage },
  );

  if (result.purgedRecordCount === 0 && !priorPurge) {
    return apiError('NOT_FOUND', requestId, undefined, `No records for child ${childId}.`);
  }

  return apiSuccess(
    { deleted: true, purgedRecordCount: result.purgedRecordCount },
    { requestId },
  );
}

export const DELETE = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'ecosystem'],
  requiredPermission: 'children:delete',
});
