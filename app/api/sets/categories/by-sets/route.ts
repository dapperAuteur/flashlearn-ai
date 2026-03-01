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
      category: { $ne: null },
    })
      .select('_id category')
      .populate('category', 'name color')
      .lean();

    const categories: Record<string, { name: string; color: string }> = {};
    for (const set of sets) {
      const cat = set.category as { name?: string; color?: string } | null;
      if (cat?.name && cat?.color) {
        categories[String(set._id)] = { name: cat.name, color: cat.color };
      }
    }

    return NextResponse.json({ categories });
  } catch (error) {
    Logger.error(LogContext.FLASHCARD, 'Error fetching categories by sets', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
