import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { generateFlashcardsFromYouTube } from '@/lib/services/youtubeGeneration';
import { FlashcardSet as FlashcardSetModel } from '@/models/FlashcardSet';
import { Profile as ProfileModel } from '@/models/Profile';
import { Logger, LogContext, AnalyticsLogger } from '@/lib/logging/logger';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * POST /api/v1/generate/youtube
 *
 * JSON body: `url` (watch link, youtu.be link, embed link, or bare video id),
 * optional `prompt` (author instructions), optional `title` and `description` for
 * the created set. Same auth, quota, and response envelope as POST /api/v1/generate.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  const startTime = Date.now();

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Request body must be valid JSON.');
  }

  const { url, prompt: rawPrompt, title, description } = body as {
    url?: unknown;
    prompt?: unknown;
    title?: string;
    description?: string;
  };

  let result;
  try {
    result = await generateFlashcardsFromYouTube({ url, rawPrompt, keyType: context.keyType });
  } catch (error) {
    await Logger.error(LogContext.AI, 'API: YouTube flashcard generation failed.', {
      requestId,
      userId: context.user._id.toString(),
      error,
    });
    return apiError('AI_GENERATION_FAILED', requestId);
  }

  if (!result.ok) {
    if (result.code === 'NO_CARDS') {
      return apiError('AI_GENERATION_FAILED', requestId, undefined, result.message);
    }
    return apiError('INVALID_INPUT', requestId, { field: 'url' }, result.message);
  }

  const durationMs = Date.now() - startTime;

  await dbConnect();

  await AnalyticsLogger.trackAiGeneration(
    context.user._id.toString(), result.videoId, result.flashcards.length, durationMs
  );

  let userProfile = await ProfileModel.findOne({ user: context.user._id });
  if (!userProfile) {
    userProfile = await ProfileModel.create({
      user: context.user._id,
      profileName: 'Default Profile',
    });
  }

  const newSet = await FlashcardSetModel.create({
    profile: userProfile._id,
    title: title || `YouTube video ${result.videoId}`,
    description: description || '',
    isPublic: false,
    source: 'YouTube',
    flashcards: result.flashcards.map(card => ({
      ...card,
      mlData: {
        easinessFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date(),
      },
    })),
    cardCount: result.flashcards.length,
  });

  await Logger.info(LogContext.FLASHCARD, 'API: Created flashcard set from a YouTube transcript.', {
    requestId,
    userId: context.user._id.toString(),
    metadata: { setId: newSet._id, keyType: context.keyType, videoId: result.videoId },
  });

  return apiSuccess({
    flashcards: result.flashcards.map(c => ({ front: c.front, back: c.back })),
    setId: newSet._id.toString(),
    source: 'generated',
    cardCount: result.flashcards.length,
    videoId: result.videoId,
    transcriptLength: result.transcriptLength,
  }, { requestId }, 201);
}

export const POST = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'generate',
  isGenerationRoute: true,
});
