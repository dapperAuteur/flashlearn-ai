import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const categoryId = searchParams.get('category') || '';

  const query: Record<string, unknown> = { isPublic: true };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }

  if (categoryId) {
    query.category = new mongoose.Types.ObjectId(categoryId);
  }

  const [sets, total] = await Promise.all([
    FlashcardSet.find(query)
      .select('title description cardCount source category tags isFeatured createdAt')
      .populate('category', 'name slug color')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    FlashcardSet.countDocuments(query),
  ]);

  // Fetch featured sets on first page when no search or category filter
  let featured: Record<string, unknown>[] = [];
  if (offset === 0 && !search && !categoryId) {
    const featuredSets = await FlashcardSet.find({ isPublic: true, isFeatured: true })
      .select('title description cardCount source category tags createdAt featuredOrder')
      .populate('category', 'name slug color')
      .sort({ featuredOrder: 1 })
      .lean();

    featured = featuredSets.map((s: Record<string, unknown>) => ({
      id: String(s._id),
      title: s.title,
      description: (s.description as string) || '',
      cardCount: s.cardCount,
      source: s.source,
      category: s.category || null,
      tags: s.tags || [],
      createdAt: s.createdAt,
    }));
  }

  return NextResponse.json({
    sets: sets.map((s: Record<string, unknown>) => ({
      id: String(s._id),
      title: s.title,
      description: (s.description as string) || '',
      cardCount: s.cardCount,
      source: s.source,
      category: s.category || null,
      tags: s.tags || [],
      createdAt: s.createdAt,
    })),
    featured,
    total,
    hasMore: offset + limit < total,
  });
}
