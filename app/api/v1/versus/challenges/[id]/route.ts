/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { Challenge } from '@/models/Challenge';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/** GET /api/v1/versus/challenges/[id] — Get challenge details */
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  const id = request.nextUrl.pathname.split('/').pop();
  await dbConnect();

  const challenge: any = await Challenge.findById(id).lean();
  if (!challenge) return apiError('NOT_FOUND', requestId, undefined, 'Challenge not found.');

  return apiSuccess({
    id: String(challenge._id),
    challengeCode: challenge.challengeCode,
    setName: challenge.setName,
    studyMode: challenge.studyMode,
    studyDirection: challenge.studyDirection,
    scope: challenge.scope,
    status: challenge.status,
    cardCount: challenge.cardCount,
    maxParticipants: challenge.maxParticipants,
    expiresAt: challenge.expiresAt,
    participants: (challenge.participants || []).map((p: any) => ({
      userName: p.userName,
      status: p.status,
      compositeScore: p.compositeScore,
      rank: p.rank,
      completedAt: p.completedAt,
      scoreBreakdown: p.scoreBreakdown,
    })),
    createdAt: challenge.createdAt,
  }, { requestId });
}

export const GET = withApiAuth(handler, { allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'], requiredPermission: 'versus:read' });
