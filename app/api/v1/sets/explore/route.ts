import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess } from '@/lib/api/withApiAuth';
import { FlashcardSet as FlashcardSetModel } from '@/models/FlashcardSet';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * GET /api/v1/sets/explore
 * Browse public flashcard sets.
 * Query params: page, limit, search, category, sort (popular|recent)
 */
async function handler(request: NextRequest, context: ApiAuthContext, requestId: string) {
  await dbConnect();

  const url = request.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const search = url.searchParams.get('search');
  const category = url.searchParams.get('category');
  const sort = url.searchParams.get('sort') || 'recent';

  const filter: Record<string, unknown> = { isPublic: true };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (category) {
    filter.categories = category;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortOption: any = sort === 'popular'
    ? { usageCount: -1, createdAt: -1 }
    : { createdAt: -1 };

  const [sets, total] = await Promise.all([
    FlashcardSetModel.find(filter)
      .select('title description source cardCount ratings usageCount createdAt')
      .sort(sortOption)
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
      cardCount: s.cardCount,
      rating: s.ratings?.average || 0,
      usageCount: s.usageCount || 0,
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

export const GET = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'sets:explore',
});
