import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { Category } from '@/models/Category';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Logger, LogContext } from '@/lib/logging/logger';
import mongoose from 'mongoose';

const secret = process.env.NEXTAUTH_SECRET;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim();
    if (body.color !== undefined) updates.color = body.color;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    // Regenerate slug if name changed
    if (updates.name) {
      updates.slug = (updates.name as string)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    await dbConnect();

    const category = await Category.findByIdAndUpdate(id, updates, { new: true });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    Logger.info(LogContext.SYSTEM, `Admin updated category: ${category.name}`, {
      adminId: token.id,
      categoryId: id,
      updates: Object.keys(updates),
    });

    return NextResponse.json({ category });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error updating category', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id } = await params;
    await dbConnect();

    // Remove category reference from all sets that use it
    await FlashcardSet.updateMany(
      { categories: new mongoose.Types.ObjectId(id) },
      { $pull: { categories: new mongoose.Types.ObjectId(id) } }
    );

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    Logger.info(LogContext.SYSTEM, `Admin deleted category: ${category.name}`, {
      adminId: token.id,
      categoryId: id,
    });

    return NextResponse.json({ message: 'Category deleted' });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error deleting category', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
