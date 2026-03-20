/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess } from '@/lib/api/withApiAuth';
import { Challenge } from '@/models/Challenge';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/** GET /api/v1/versus/open — Browse open public challenges */
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  await dbConnect();

  const url = request.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));

  const filter = { scope: 'public', status: 'active', expiresAt: { $gt: new Date() } };

  const [challenges, total] = await Promise.all([
    Challenge.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Challenge.countDocuments(filter),
  ]);

  return apiSuccess({
    challenges: challenges.map((c: any) => ({
      id: String(c._id), challengeCode: c.challengeCode, setName: c.setName,
      studyMode: c.studyMode, cardCount: c.cardCount,
      participantCount: c.participants?.length || 0, maxParticipants: c.maxParticipants,
      expiresAt: c.expiresAt, createdAt: c.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, { requestId });
}

export const GET = withApiAuth(handler, { allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'], requiredPermission: 'versus:read' });
