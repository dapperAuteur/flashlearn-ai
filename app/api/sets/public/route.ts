import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';

export async function GET(request: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const query: Record<string, unknown> = { isPublic: true };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [sets, total] = await Promise.all([
    FlashcardSet.find(query)
      .select('title description cardCount source createdAt')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    FlashcardSet.countDocuments(query),
  ]);

  return NextResponse.json({
    sets: sets.map((s: Record<string, unknown>) => ({
      id: String(s._id),
      title: s.title,
      description: s.description || '',
      cardCount: s.cardCount,
      source: s.source,
      createdAt: s.createdAt,
    })),
    total,
    hasMore: offset + limit < total,
  });
}
