import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { StudySession } from '@/models/StudySession';
import { CardResult as CardResultModel } from '@/models/CardResult';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * POST /api/v1/study/sessions/[id]/complete
 * Complete a study session with card results.
 * Body: { results: [{ cardId, isCorrect, timeSeconds, confidenceRating? }] }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  const sessionId = request.nextUrl.pathname.split('/').at(-2); // .../[id]/complete

  let body;
  try { body = await request.json(); } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Request body must be valid JSON.');
  }

  const { results } = body as {
    results?: { cardId: string; isCorrect: boolean; timeSeconds: number; confidenceRating?: number }[];
  };

  if (!results || !Array.isArray(results) || results.length === 0) {
    return apiError('INVALID_INPUT', requestId, { field: 'results' }, 'Results array is required.');
  }

  await dbConnect();

  const userId = String(context.user._id);
  const session = await StudySession.findOne({
    _id: sessionId,
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!session) return apiError('NOT_FOUND', requestId, undefined, 'Study session not found.');
  if (session.status === 'completed') return apiError('INVALID_INPUT', requestId, undefined, 'Session already completed.');

  // Save card results
  const cardResults = results.map(r => ({
    sessionId: session._id,
    userId: new mongoose.Types.ObjectId(userId),
    flashcardId: new mongoose.Types.ObjectId(r.cardId),
    isCorrect: r.isCorrect,
    timeSpent: r.timeSeconds,
    confidenceRating: r.confidenceRating || 3,
  }));

  await CardResultModel.insertMany(cardResults);

  // Update session
  const correctCount = results.filter(r => r.isCorrect).length;
  const incorrectCount = results.filter(r => !r.isCorrect).length;

  session.status = 'completed';
  session.endTime = new Date();
  session.completedCards = results.length;
  session.correctCount = correctCount;
  session.incorrectCount = incorrectCount;
  await session.save();

  const durationSeconds = session.endTime && session.startTime
    ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000)
    : 0;
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

  return apiSuccess({
    sessionId: String(session._id),
    status: 'completed',
    totalCards: session.totalCards,
    completedCards: results.length,
    correctCount,
    incorrectCount,
    accuracy,
    durationSeconds,
  }, { requestId });
}

export const POST = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'study:write',
});
