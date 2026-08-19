import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { StudySession } from '@/models/StudySession';
import { CardResult as CardResultModel } from '@/models/CardResult';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';
import { fireOutboxDrafts } from '@/lib/outbox-trigger';

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

  // Save card results. The field names have to match models/CardResult: it wants
  // the session's own `sessionId` string, a `setId`, and `timeSeconds`. This
  // route was sending the Mongo _id, a `userId` the schema does not carry, and
  // `timeSpent`, so every call failed validation before it could finish a
  // session.
  const cardResults = results.map(r => ({
    sessionId: session.sessionId,
    setId: String(session.listId),
    flashcardId: String(r.cardId),
    isCorrect: r.isCorrect,
    timeSeconds: r.timeSeconds,
    confidenceRating: r.confidenceRating || 3,
    studyMode: session.studyMode || 'classic',
    studyDirection: session.studyDirection || 'front-to-back',
  }));

  await CardResultModel.insertMany(cardResults, { ordered: false });

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

  // 4a: a completed study session, matching the internal completion route.
  // Two conditions, both about who did the work:
  //   - The session is looked up by `userId: context.user._id` above, so the
  //     learner and the API-key owner are always the same account here. That
  //     account id is what the outbox gate reads, so a draft only ever fires
  //     for an account that opted in (or the product owner).
  //   - A proctored session is skipped for the reason the internal route gives:
  //     the caption is first person, and on a proctored session the student did
  //     the work rather than whoever held the device.
  // The external_ref uses the stored `sessionId`, the same key the internal
  // route uses, so one session cannot draft twice through two doors.
  if (!session.proctorId) {
    const durationMin = Math.max(1, Math.round(durationSeconds / 60));
    const deckTitle = session.setName ?? 'a study set';
    fireOutboxDrafts({
      triggerUserId: userId,
      externalRefBase: `study-session-${String(session.sessionId ?? session._id)}`,
      caption: `Just drilled ${results.length} cards on "${deckTitle}": ${accuracy}% recall after ${durationMin} minute${durationMin === 1 ? '' : 's'}.`,
    });
  }

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
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app', 'ecosystem'],
  requiredPermission: 'study:write',
});
