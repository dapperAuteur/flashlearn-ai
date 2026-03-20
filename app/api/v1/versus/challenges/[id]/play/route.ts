/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { Challenge } from '@/models/Challenge';
import { FlashcardSet } from '@/models/FlashcardSet';
import { StudySession } from '@/models/StudySession';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/** POST /api/v1/versus/challenges/[id]/play — Start playing a challenge */
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  const pathParts = request.nextUrl.pathname.split('/');
  const id = pathParts[pathParts.indexOf('challenges') + 1];

  await dbConnect();
  const userId = new mongoose.Types.ObjectId(String(context.user._id));

  const challenge = await Challenge.findById(id);
  if (!challenge) return apiError('NOT_FOUND', requestId, undefined, 'Challenge not found.');
  if (challenge.status !== 'active') return apiError('INVALID_INPUT', requestId, undefined, 'Challenge is no longer active.');
  if (new Date() > challenge.expiresAt) {
    challenge.status = 'expired'; await challenge.save();
    return apiError('INVALID_INPUT', requestId, undefined, 'Challenge has expired.');
  }

  const participant = challenge.participants.find((p: any) => p.userId.toString() === userId.toString());
  if (!participant) return apiError('FORBIDDEN', requestId, undefined, 'You are not a participant.');
  if (participant.sessionId) return apiError('INVALID_INPUT', requestId, undefined, 'Already started this challenge.');
  if (participant.status === 'completed') return apiError('INVALID_INPUT', requestId, undefined, 'Already completed.');

  const flashcardSet: any = await FlashcardSet.findById(challenge.flashcardSetId).lean();
  if (!flashcardSet) return apiError('NOT_FOUND', requestId, undefined, 'Flashcard set not found.');

  const allCards = flashcardSet.flashcards || [];
  const cardMap = new Map(allCards.map((c: any) => [c._id.toString(), c]));
  const orderedCards = challenge.cardIds.map((cid: string) => cardMap.get(cid)).filter(Boolean);

  const sessionId = crypto.randomUUID();
  await StudySession.create({
    sessionId, userId, listId: challenge.flashcardSetId, setName: flashcardSet.title,
    startTime: new Date(), status: 'active', totalCards: orderedCards.length,
    correctCount: 0, incorrectCount: 0, completedCards: 0, studyDirection: challenge.studyDirection,
  });

  participant.sessionId = sessionId;
  await challenge.save();

  return apiSuccess({
    sessionId,
    challengeId: String(challenge._id),
    studyMode: challenge.studyMode,
    studyDirection: challenge.studyDirection,
    flashcards: orderedCards.map((c: any) => ({ id: c._id.toString(), front: c.front, back: c.back })),
  }, { requestId });
}

export const POST = withApiAuth(handler, { allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'], requiredPermission: 'versus:write' });
