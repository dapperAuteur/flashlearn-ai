/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { Challenge } from '@/models/Challenge';
import { User } from '@/models/User';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/** POST /api/v1/versus/join — Join a challenge by code */
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  let body;
  try { body = await request.json(); } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Invalid JSON.');
  }

  const { challengeCode } = body;
  if (!challengeCode) return apiError('INVALID_INPUT', requestId, { field: 'challengeCode' }, 'Challenge code is required.');

  await dbConnect();
  const userId = new mongoose.Types.ObjectId(String(context.user._id));

  const challenge = await Challenge.findOne({ challengeCode: challengeCode.toUpperCase().trim() });
  if (!challenge) return apiError('NOT_FOUND', requestId, undefined, 'Challenge not found.');

  if (new Date() > challenge.expiresAt) {
    challenge.status = 'expired'; await challenge.save();
    return apiError('INVALID_INPUT', requestId, undefined, 'Challenge has expired.');
  }
  if (challenge.status === 'completed') return apiError('INVALID_INPUT', requestId, undefined, 'Challenge already completed.');
  if (challenge.status === 'expired') return apiError('INVALID_INPUT', requestId, undefined, 'Challenge has expired.');

  const alreadyJoined = challenge.participants.some((p: any) => p.userId.toString() === userId.toString());
  if (alreadyJoined) {
    return apiSuccess({ challengeId: String(challenge._id), message: 'Already joined.' }, { requestId });
  }

  const activeCount = challenge.participants.filter((p: any) => p.status !== 'declined').length;
  if (activeCount >= challenge.maxParticipants) return apiError('INVALID_INPUT', requestId, undefined, 'Challenge is full.');

  const user = await User.findById(userId).select('name').lean();
  challenge.participants.push({ userId, userName: (user as any)?.name || 'Unknown', status: 'accepted' });
  await challenge.save();

  return apiSuccess({
    challengeId: String(challenge._id),
    challengeCode: challenge.challengeCode,
    setName: challenge.setName,
    studyMode: challenge.studyMode,
    cardCount: challenge.cardCount,
    participantCount: challenge.participants.length,
  }, { requestId });
}

export const POST = withApiAuth(handler, { allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'], requiredPermission: 'versus:write' });
