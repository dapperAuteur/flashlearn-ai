import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { FlashcardSet as FlashcardSetModel } from '@/models/FlashcardSet';
import { Profile as ProfileModel } from '@/models/Profile';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * GET /api/v1/sets/[id]
 * Get a specific flashcard set with all cards.
 */
async function handleGet(request: NextRequest, context: ApiAuthContext, requestId: string) {
  const id = request.nextUrl.pathname.split('/').pop();

  await dbConnect();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set: any = await FlashcardSetModel.findById(id).lean();
  if (!set) {
    return apiError('NOT_FOUND', requestId, undefined, 'Flashcard set not found.');
  }

  // Check ownership: user must own the set (via profiles) or set must be public
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles: any[] = await ProfileModel.find({ user: context.user._id }).select('_id').lean();
  const profileIds = profiles.map(p => String(p._id));
  const isOwner = profileIds.includes(String(set.profile));

  if (!isOwner && !set.isPublic) {
    return apiError('NOT_FOUND', requestId, undefined, 'Flashcard set not found.');
  }

  return apiSuccess({
    id: String(set._id),
    title: set.title,
    description: set.description,
    source: set.source,
    isPublic: set.isPublic,
    cardCount: set.cardCount,
    rating: set.ratings?.average || 0,
    flashcards: set.flashcards.map((c: { _id: unknown; front: string; back: string }) => ({
      id: String(c._id),
      front: c.front,
      back: c.back,
    })),
    createdAt: set.createdAt,
    updatedAt: set.updatedAt,
  }, { requestId });
}

/**
 * PATCH /api/v1/sets/[id]
 * Update a flashcard set (title, description, isPublic, or flashcards).
 */
async function handlePatch(request: NextRequest, context: ApiAuthContext, requestId: string) {
  const id = request.nextUrl.pathname.split('/').pop();

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Request body must be valid JSON.');
  }

  await dbConnect();

  const set = await FlashcardSetModel.findById(id);
  if (!set) {
    return apiError('NOT_FOUND', requestId, undefined, 'Flashcard set not found.');
  }

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles: any[] = await ProfileModel.find({ user: context.user._id }).select('_id').lean();
  const profileIds = profiles.map(p => String(p._id));
  if (!profileIds.includes(set.profile.toString())) {
    return apiError('FORBIDDEN', requestId, undefined, 'You do not own this flashcard set.');
  }

  const { title, description, isPublic, flashcards } = body;

  if (title !== undefined) set.title = title;
  if (description !== undefined) set.description = description;
  if (isPublic !== undefined) set.isPublic = isPublic;
  if (flashcards !== undefined) {
    if (!Array.isArray(flashcards) || flashcards.some((c: { front?: string; back?: string }) => !c.front || !c.back)) {
      return apiError('INVALID_INPUT', requestId, { field: 'flashcards' },
        'Each flashcard must have front and back fields.');
    }
    set.flashcards = flashcards.map((card: { front: string; back: string }) => ({
      front: card.front,
      back: card.back,
      mlData: { easinessFactor: 2.5, interval: 0, repetitions: 0, nextReviewDate: new Date() },
    }));
    set.cardCount = flashcards.length;
  }

  await set.save();

  return apiSuccess({
    id: set._id.toString(),
    title: set.title,
    description: set.description,
    isPublic: set.isPublic,
    cardCount: set.cardCount,
    updatedAt: set.updatedAt,
  }, { requestId });
}

/**
 * DELETE /api/v1/sets/[id]
 * Delete a flashcard set.
 */
async function handleDelete(request: NextRequest, context: ApiAuthContext, requestId: string) {
  const id = request.nextUrl.pathname.split('/').pop();

  await dbConnect();

  const set = await FlashcardSetModel.findById(id);
  if (!set) {
    return apiError('NOT_FOUND', requestId, undefined, 'Flashcard set not found.');
  }

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles: any[] = await ProfileModel.find({ user: context.user._id }).select('_id').lean();
  const profileIds = profiles.map(p => String(p._id));
  if (!profileIds.includes(set.profile.toString())) {
    return apiError('FORBIDDEN', requestId, undefined, 'You do not own this flashcard set.');
  }

  await FlashcardSetModel.findByIdAndDelete(id);

  return apiSuccess({ deleted: true, id }, { requestId });
}

export const GET = withApiAuth(handleGet, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'sets:read',
});

export const PATCH = withApiAuth(handlePatch, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'sets:write',
});

export const DELETE = withApiAuth(handleDelete, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'sets:write',
});
