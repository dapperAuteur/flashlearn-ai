import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
import { authOptions } from '@/lib/auth/auth';
import { Logger, LogContext } from '@/lib/logging/logger';

// POST /api/sets/categories/by-sets - Batch fetch category info for a list of set IDs
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { setIds } = await request.json();
    if (!Array.isArray(setIds) || setIds.length === 0) {
      return NextResponse.json({ categories: {} });
    }

    // Limit to 100 set IDs per request
    const limitedIds = setIds.slice(0, 100).filter((id: string) => ObjectId.isValid(id));

    await dbConnect();

    const sets = await FlashcardSet.find({
      _id: { $in: limitedIds.map((id: string) => new ObjectId(id)) },
      categories: { $exists: true, $ne: [] },
    })
      .select('_id categories')
      .populate('categories', 'name color')
      .lean();

    const categories: Record<string, Array<{ id: string; name: string; color: string }>> = {};
    for (const set of sets) {
      const cats = (set as Record<string, unknown>).categories as Array<{ _id: unknown; name?: string; color?: string }> | undefined;
      if (cats && cats.length > 0) {
        const valid = cats
          .filter(c => c?.name && c?.color)
          .map(c => ({ id: String(c._id), name: c.name!, color: c.color! }));
        if (valid.length > 0) {
          categories[String(set._id)] = valid;
        }
      }
    }

    return NextResponse.json({ categories });
  } catch (error) {
    Logger.error(LogContext.FLASHCARD, 'Error fetching categories by sets', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
