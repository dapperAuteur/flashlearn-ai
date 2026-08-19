import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { generateFlashcardsFromPdf } from '@/lib/services/pdfGeneration';
import { FlashcardSet as FlashcardSetModel } from '@/models/FlashcardSet';
import { Profile as ProfileModel } from '@/models/Profile';
import { Logger, LogContext, AnalyticsLogger } from '@/lib/logging/logger';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * POST /api/v1/generate/pdf
 *
 * Multipart upload: `file` (the PDF), optional `prompt` (author instructions),
 * optional `title` and `description` for the created set. Same auth, quota, and
 * response envelope as POST /api/v1/generate.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  const startTime = Date.now();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError('INVALID_INPUT', requestId, undefined,
      'Request body must be multipart/form-data with a `file` field.');
  }

  const file = formData.get('file') as File | null;
  const rawPrompt = formData.get('prompt');
  const rawTitle = formData.get('title');
  const rawDescription = formData.get('description');
  const title = typeof rawTitle === 'string' ? rawTitle : undefined;
  const description = typeof rawDescription === 'string' ? rawDescription : undefined;

  let result;
  try {
    result = await generateFlashcardsFromPdf({ file, rawPrompt, keyType: context.keyType });
  } catch (error) {
    await Logger.error(LogContext.AI, 'API: PDF flashcard generation failed.', {
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
    return apiError('INVALID_INPUT', requestId, { field: 'file' }, result.message);
  }

  const durationMs = Date.now() - startTime;
  const sourceLabel = file?.name || 'pdf upload';

  await dbConnect();

  await AnalyticsLogger.trackAiGeneration(
    context.user._id.toString(), sourceLabel, result.flashcards.length, durationMs
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
    title: title || sourceLabel,
    description: description || '',
    isPublic: false,
    source: 'PDF',
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

  await Logger.info(LogContext.FLASHCARD, 'API: Created flashcard set from PDF.', {
    requestId,
    userId: context.user._id.toString(),
    metadata: { setId: newSet._id, keyType: context.keyType, pageCount: result.pageCount },
  });

  return apiSuccess({
    flashcards: result.flashcards.map(c => ({ front: c.front, back: c.back })),
    setId: newSet._id.toString(),
    source: 'generated',
    cardCount: result.flashcards.length,
    pageCount: result.pageCount,
    textLength: result.textLength,
  }, { requestId }, 201);
}

export const POST = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'generate',
  isGenerationRoute: true,
});
