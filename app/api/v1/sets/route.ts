import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { FlashcardSet as FlashcardSetModel } from '@/models/FlashcardSet';
import { Profile as ProfileModel } from '@/models/Profile';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * GET /api/v1/sets
 * List flashcard sets belonging to the authenticated API user.
 * Query params: page, limit, source
 */
async function handleGet(request: NextRequest, context: ApiAuthContext, requestId: string) {
  await dbConnect();

  const url = request.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const source = url.searchParams.get('source');

  // Get user's profiles
  const profiles = await ProfileModel.find({ user: context.user._id }).select('_id').lean();
  const profileIds = profiles.map(p => p._id);

  const filter: Record<string, unknown> = { profile: { $in: profileIds } };
  if (source) filter.source = source;

  const [sets, total] = await Promise.all([
    FlashcardSetModel.find(filter)
      .select('title description source isPublic cardCount ratings createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    FlashcardSetModel.countDocuments(filter),
  ]);

  return apiSuccess({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sets: (sets as any[]).map(s => ({
      id: String(s._id),
      title: s.title,
      description: s.description,
      source: s.source,
      isPublic: s.isPublic,
      cardCount: s.cardCount,
      rating: s.ratings?.average || 0,
      createdAt: s.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, { requestId });
}

/**
 * POST /api/v1/sets
 * Create a new flashcard set.
 * Body: { title, description?, isPublic?, flashcards: [{front, back}] }
 */
async function handlePost(request: NextRequest, context: ApiAuthContext, requestId: string) {
  let body;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Request body must be valid JSON.');
  }

  const { title, description, isPublic, flashcards } = body as {
    title?: string;
    description?: string;
    isPublic?: boolean;
    flashcards?: { front: string; back: string }[];
  };

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return apiError('INVALID_INPUT', requestId, { field: 'title' }, 'Title is required.');
  }

  if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
    return apiError('INVALID_INPUT', requestId, { field: 'flashcards' }, 'At least one flashcard is required.');
  }

  if (flashcards.some(c => !c.front || !c.back)) {
    return apiError('INVALID_INPUT', requestId, { field: 'flashcards' }, 'Each flashcard must have front and back fields.');
  }

  await dbConnect();

  let userProfile = await ProfileModel.findOne({ user: context.user._id });
  if (!userProfile) {
    userProfile = await ProfileModel.create({
      user: context.user._id,
      profileName: 'Default Profile',
    });
  }

  const newSet = await FlashcardSetModel.create({
    profile: userProfile._id,
    title: title.trim(),
    description: description || '',
    isPublic: isPublic !== undefined ? isPublic : true,
    source: 'CSV', // API-created sets marked as CSV source
    flashcards: flashcards.map(card => ({
      front: card.front,
      back: card.back,
      mlData: {
        easinessFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewDate: new Date(),
      },
    })),
    cardCount: flashcards.length,
  });

  return apiSuccess({
    id: newSet._id.toString(),
    title: newSet.title,
    description: newSet.description,
    isPublic: newSet.isPublic,
    cardCount: newSet.flashcards.length,
    flashcards: newSet.flashcards.map((c: { front: string; back: string }) => ({
      front: c.front,
      back: c.back,
    })),
    createdAt: newSet.createdAt,
  }, { requestId }, 201);
}

export const GET = withApiAuth(handleGet, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'sets:read',
});

export const POST = withApiAuth(handlePost, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'sets:write',
});
