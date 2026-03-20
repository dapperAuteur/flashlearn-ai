import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { generateFlashcardsFromAI } from '@/lib/services/flashcardGeneration';
import { FlashcardSet as FlashcardSetModel } from '@/models/FlashcardSet';
import { Profile as ProfileModel } from '@/models/Profile';
import { Logger, LogContext, AnalyticsLogger } from '@/lib/logging/logger';
import { normalizeTopicForClustering } from '@/lib/utils/normalizeTopicForClustering';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  const startTime = Date.now();

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Request body must be valid JSON.');
  }

  const { topic, title, description } = body as {
    topic?: string;
    title?: string;
    description?: string;
  };

  if (!topic || typeof topic !== 'string' || topic.trim() === '') {
    return apiError('INVALID_INPUT', requestId, { field: 'topic' }, 'Topic is required and must be a non-empty string.');
  }

  await dbConnect();

  // Check for existing public set with same topic
  const normalizedTopic = normalizeTopicForClustering(topic);
  const existingSet = await FlashcardSetModel.findOne({
    title: normalizedTopic,
    isPublic: true,
  });

  if (existingSet) {
    await FlashcardSetModel.findByIdAndUpdate(existingSet._id, { $inc: { usageCount: 1 } });
    await AnalyticsLogger.trackEvent({
      userId: context.user._id.toString(),
      eventType: AnalyticsLogger.EventType.SHARED_FLASHCARDS_USED,
      properties: {
        setId: existingSet._id.toString(),
        topic: existingSet.title,
        cardCount: existingSet.flashcards.length,
        source: 'api',
      },
    });

    return apiSuccess({
      flashcards: existingSet.flashcards.map((c: { front: string; back: string }) => ({
        front: c.front,
        back: c.back,
      })),
      setId: existingSet._id.toString(),
      source: 'shared',
      cardCount: existingSet.flashcards.length,
    }, { requestId });
  }

  // Generate new flashcards using the Gemini key for this API key type
  await AnalyticsLogger.trackPromptSubmission(context.user._id.toString(), topic, 'api');

  let flashcards;
  try {
    flashcards = await generateFlashcardsFromAI(topic, requestId, context.keyType);
  } catch {
    return apiError('AI_GENERATION_FAILED', requestId);
  }

  const durationMs = Date.now() - startTime;

  if (!flashcards || flashcards.length === 0) {
    return apiError('AI_GENERATION_FAILED', requestId, undefined,
      'No valid flashcards could be generated. Try a different topic.');
  }

  await AnalyticsLogger.trackAiGeneration(
    context.user._id.toString(), topic, flashcards.length, durationMs
  );

  // Create the flashcard set
  let userProfile = await ProfileModel.findOne({ user: context.user._id });
  if (!userProfile) {
    userProfile = await ProfileModel.create({
      user: context.user._id,
      profileName: 'Default Profile',
    });
  }

  const newSet = await FlashcardSetModel.create({
    profile: userProfile._id,
    title: title || topic,
    description: description || '',
    isPublic: true,
    source: 'Prompt',
    flashcards: flashcards.map(card => ({
      ...card,
      mlData: {
        easinessFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date(),
      },
    })),
    cardCount: flashcards.length,
  });

  await Logger.info(LogContext.FLASHCARD, 'API: Created flashcard set.', {
    requestId,
    userId: context.user._id.toString(),
    metadata: { setId: newSet._id, keyType: context.keyType },
  });

  return apiSuccess({
    flashcards: flashcards.map(c => ({ front: c.front, back: c.back })),
    setId: newSet._id.toString(),
    source: 'generated',
    cardCount: flashcards.length,
  }, { requestId }, 201);
}

export const POST = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'generate',
  isGenerationRoute: true,
});
