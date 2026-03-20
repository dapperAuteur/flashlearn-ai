import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { generateFlashcardsFromAI } from '@/lib/services/flashcardGeneration';
import { FlashcardSet as FlashcardSetModel } from '@/models/FlashcardSet';
import { Profile as ProfileModel } from '@/models/Profile';
import { Logger, LogContext, AnalyticsLogger } from '@/lib/logging/logger';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

const MAX_BATCH_SIZE = 10;

/**
 * POST /api/v1/generate/batch
 * Generate flashcards for multiple topics in a single request.
 * Enterprise feature — requires Pro or Enterprise tier.
 *
 * Body: { topics: [{ topic: string, title?: string, description?: string }] }
 * Returns: { results: [{ topic, status, flashcards?, setId?, error? }] }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  // Batch is available to Pro and Enterprise tiers only
  if (context.apiTier !== 'Pro' && context.apiTier !== 'Enterprise') {
    return apiError('FORBIDDEN', requestId, undefined,
      'Batch generation requires a Pro or Enterprise API tier.');
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Request body must be valid JSON.');
  }

  const { topics } = body as {
    topics?: { topic: string; title?: string; description?: string }[];
  };

  if (!topics || !Array.isArray(topics) || topics.length === 0) {
    return apiError('INVALID_INPUT', requestId, { field: 'topics' },
      'Topics array is required and must not be empty.');
  }

  if (topics.length > MAX_BATCH_SIZE) {
    return apiError('INVALID_INPUT', requestId, { field: 'topics', maxBatchSize: MAX_BATCH_SIZE },
      `Maximum ${MAX_BATCH_SIZE} topics per batch request.`);
  }

  if (topics.some(t => !t.topic || typeof t.topic !== 'string' || t.topic.trim() === '')) {
    return apiError('INVALID_INPUT', requestId, { field: 'topics' },
      'Each item must have a non-empty topic string.');
  }

  await dbConnect();

  let userProfile = await ProfileModel.findOne({ user: context.user._id });
  if (!userProfile) {
    userProfile = await ProfileModel.create({
      user: context.user._id,
      profileName: 'Default Profile',
    });
  }

  const results = [];

  for (const item of topics) {
    const startTime = Date.now();
    try {
      const flashcards = await generateFlashcardsFromAI(
        item.topic, requestId, context.keyType
      );

      if (!flashcards || flashcards.length === 0) {
        results.push({ topic: item.topic, status: 'failed', error: 'No flashcards generated.' });
        continue;
      }

      const durationMs = Date.now() - startTime;
      await AnalyticsLogger.trackAiGeneration(
        context.user._id.toString(), item.topic, flashcards.length, durationMs
      );

      const newSet = await FlashcardSetModel.create({
        profile: userProfile._id,
        title: item.title || item.topic,
        description: item.description || '',
        isPublic: true,
        source: 'Prompt',
        flashcards: flashcards.map(card => ({
          ...card,
          mlData: { easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date() },
        })),
        cardCount: flashcards.length,
      });

      results.push({
        topic: item.topic,
        status: 'success',
        setId: newSet._id.toString(),
        cardCount: flashcards.length,
        flashcards: flashcards.map(c => ({ front: c.front, back: c.back })),
      });
    } catch (err) {
      Logger.error(LogContext.AI, `Batch generation failed for topic: ${item.topic}`, {
        requestId, error: err,
      });
      results.push({ topic: item.topic, status: 'failed', error: 'AI generation failed.' });
    }
  }

  const succeeded = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;

  Logger.info(LogContext.AI, `Batch generation complete: ${succeeded} succeeded, ${failed} failed.`, {
    requestId,
    userId: context.user._id.toString(),
    metadata: { batchSize: topics.length, succeeded, failed },
  });

  return apiSuccess({
    results,
    summary: { total: topics.length, succeeded, failed },
  }, { requestId }, 201);
}

export const POST = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin'],
  requiredPermission: 'generate',
  isGenerationRoute: true,
});
