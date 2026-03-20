import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { StudySession } from '@/models/StudySession';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * POST /api/v1/study/sessions
 * Start a new study session for a flashcard set.
 * Body: { setId, studyMode?, studyDirection?, dueOnly? }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  let body;
  try { body = await request.json(); } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Request body must be valid JSON.');
  }

  const { setId, studyMode = 'classic', studyDirection = 'front-to-back' } = body;
  if (!setId) return apiError('INVALID_INPUT', requestId, { field: 'setId' }, 'setId is required.');

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(String(context.user._id));

  // Get user profile
  let profile = await Profile.findOne({ user: userId });
  if (!profile) {
    profile = await Profile.create({ user: userId, profileName: 'Default Profile' });
  }

  // Find the set (owned or public)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set: any = await FlashcardSet.findOne({
    _id: new mongoose.Types.ObjectId(setId),
    $or: [{ profile: profile._id }, { isPublic: true }],
  }).lean();

  if (!set) return apiError('NOT_FOUND', requestId, undefined, 'Flashcard set not found or not accessible.');
  if (!set.flashcards?.length) return apiError('INVALID_INPUT', requestId, undefined, 'Set has no cards.');

  // Shuffle cards
  const cards = [...set.flashcards];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // Create session
  const session = await StudySession.create({
    sessionId: new mongoose.Types.ObjectId().toString(),
    userId,
    listId: set._id,
    setName: set.title,
    startTime: new Date(),
    status: 'active',
    totalCards: cards.length,
    completedCards: 0,
    correctCount: 0,
    incorrectCount: 0,
    studyDirection,
    studyMode,
  });

  return apiSuccess({
    sessionId: String(session._id),
    setId: String(set._id),
    setName: set.title,
    studyMode,
    studyDirection,
    totalCards: cards.length,
    flashcards: cards.map((c: { _id: unknown; front: string; back: string }) => ({
      id: String(c._id),
      front: c.front,
      back: c.back,
    })),
  }, { requestId }, 201);
}

export const POST = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'study:write',
});
