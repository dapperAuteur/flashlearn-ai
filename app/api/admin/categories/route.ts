import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { Category } from '@/models/Category';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();
    const categories = await Category.find({}).sort({ sortOrder: 1, name: 1 }).lean();

    // Get set counts for each category
    const counts = await FlashcardSet.aggregate([
      { $match: { categories: { $exists: true, $ne: [] } } },
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    const categoriesWithCounts = categories.map((cat) => ({
      ...cat,
      _id: String(cat._id),
      setCount: countMap.get(String(cat._id)) || 0,
    }));

    return NextResponse.json({ categories: categoriesWithCounts });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error fetching categories', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { name, description, color, sortOrder } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await dbConnect();

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim(),
      color: color || '#3B82F6',
      sortOrder: sortOrder ?? 0,
    });

    Logger.info(LogContext.SYSTEM, `Admin created category: ${name}`, {
      adminId: token.id,
      categoryId: String(category._id),
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error creating category', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
