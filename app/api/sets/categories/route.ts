import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Category } from '@/models/Category';
import { Logger, LogContext } from '@/lib/logging/logger';

// GET /api/sets/categories - Get all active categories (public endpoint)
export async function GET() {
  try {
    await dbConnect();

    const categories = await Category.find({ isActive: true })
      .select('name slug description color sortOrder')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: String(c._id),
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        color: c.color,
      })),
    });
  } catch (error) {
    Logger.error(LogContext.FLASHCARD, 'Error fetching categories', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
