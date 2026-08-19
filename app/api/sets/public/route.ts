import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
// Registers the Category model so `.populate('categories')` below resolves. Without
// this import the model is unregistered on a cold start and the route 500s with
// `MissingSchemaError: Schema hasn't been registered for model "Category"`.
import { Category } from '@/models/Category';
import mongoose from 'mongoose';

void Category;

export async function GET(request: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const categoryId = searchParams.get('category') || '';
  // 'rating' orders by the denormalized aggregate on the set. ratingCount is the
  // tiebreaker so one 5-star vote does not outrank a 5-star average from thirty
  // people, and createdAt keeps the order stable for unrated sets.
  const sort = searchParams.get('sort') === 'rating' ? 'rating' : 'recent';
  const sortOrder: Record<string, 1 | -1> =
    sort === 'rating'
      ? { ratingAverage: -1, ratingCount: -1, createdAt: -1 }
      : { createdAt: -1 };

  const query: Record<string, unknown> = { isPublic: true };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }

  if (categoryId) {
    query.categories = new mongoose.Types.ObjectId(categoryId);
  }

  const [sets, total] = await Promise.all([
    FlashcardSet.find(query)
      .select('title description cardCount source categories tags isFeatured createdAt ratingAverage ratingCount')
      .populate('categories', 'name slug color')
      .sort(sortOrder)
      .skip(offset)
      .limit(limit)
      .lean(),
    FlashcardSet.countDocuments(query),
  ]);

  // Fetch featured sets on first page when no search or category filter
  let featured: Record<string, unknown>[] = [];
  if (offset === 0 && !search && !categoryId) {
    const featuredSets = await FlashcardSet.find({ isPublic: true, isFeatured: true })
      .select('title description cardCount source categories tags createdAt featuredOrder ratingAverage ratingCount')
      .populate('categories', 'name slug color')
      .sort({ featuredOrder: 1 })
      .lean();

    featured = featuredSets.map((s: Record<string, unknown>) => ({
      id: String(s._id),
      title: s.title,
      description: (s.description as string) || '',
      cardCount: s.cardCount,
      source: s.source,
      categories: (s as Record<string, unknown>).categories || [],
      tags: s.tags || [],
      createdAt: s.createdAt,
      ratingAverage: (s.ratingAverage as number) ?? 0,
      ratingCount: (s.ratingCount as number) ?? 0,
    }));
  }

  return NextResponse.json({
    sets: sets.map((s: Record<string, unknown>) => ({
      id: String(s._id),
      title: s.title,
      description: (s.description as string) || '',
      cardCount: s.cardCount,
      source: s.source,
      categories: (s as Record<string, unknown>).categories || [],
      tags: s.tags || [],
      createdAt: s.createdAt,
      ratingAverage: (s.ratingAverage as number) ?? 0,
      ratingCount: (s.ratingCount as number) ?? 0,
    })),
    featured,
    total,
    hasMore: offset + limit < total,
  });
}
