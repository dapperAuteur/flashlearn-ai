import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { HelpArticle } from '@/models/HelpArticle';

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH - Update a help article
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    await dbConnect();

    const article = await HelpArticle.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error updating help article:', error);
    return NextResponse.json({ error: 'Failed to update help article' }, { status: 500 });
  }
}

// DELETE - Delete a help article
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await dbConnect();

    const article = await HelpArticle.findByIdAndDelete(id).lean();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Article deleted' });
  } catch (error) {
    console.error('Error deleting help article:', error);
    return NextResponse.json({ error: 'Failed to delete help article' }, { status: 500 });
  }
}
