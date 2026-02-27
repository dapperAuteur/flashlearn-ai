import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Logger, LogContext } from '@/lib/logging/logger';

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
    const { featuredOrder } = await request.json();

    await dbConnect();
    const set = await FlashcardSet.findByIdAndUpdate(
      id,
      { featuredOrder },
      { new: true }
    );

    if (!set) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Order updated' });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error updating featured order', { error });
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

    const set = await FlashcardSet.findByIdAndUpdate(
      id,
      { isFeatured: false, $unset: { featuredOrder: '' } },
      { new: true }
    );

    if (!set) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    Logger.info(LogContext.SYSTEM, `Admin unfeatured set: ${set.title}`, {
      adminId: token.id,
      setId: id,
    });

    return NextResponse.json({ message: 'Set unfeatured' });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error unfeaturing set', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
