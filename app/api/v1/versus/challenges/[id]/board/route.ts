/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { Challenge } from '@/models/Challenge';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/** GET /api/v1/versus/challenges/[id]/board — Get challenge leaderboard */
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  const pathParts = request.nextUrl.pathname.split('/');
  const id = pathParts[pathParts.indexOf('challenges') + 1];

  await dbConnect();

  const challenge: any = await Challenge.findById(id).lean();
  if (!challenge) return apiError('NOT_FOUND', requestId, undefined, 'Challenge not found.');

  const participants = (challenge.participants || [])
    .filter((p: any) => p.status === 'completed')
    .sort((a: any, b: any) => (b.compositeScore || 0) - (a.compositeScore || 0))
    .map((p: any, i: number) => ({
      userName: p.userName,
      rank: p.rank || i + 1,
      compositeScore: p.compositeScore || 0,
      scoreBreakdown: p.scoreBreakdown || {},
      completedAt: p.completedAt,
    }));

  return apiSuccess({
    challengeId: String(challenge._id),
    challengeCode: challenge.challengeCode,
    setName: challenge.setName,
    status: challenge.status,
    participants,
  }, { requestId });
}

export const GET = withApiAuth(handler, { allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'], requiredPermission: 'versus:read' });
