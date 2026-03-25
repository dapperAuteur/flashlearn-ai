import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { HelpArticle } from '@/models/HelpArticle';

// GET - List all help articles (including unpublished)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();

    const articles = await HelpArticle.find()
      .sort({ category: 1, order: 1 })
      .lean();

    return NextResponse.json({ articles });
  } catch (error) {
    console.error('Error fetching help articles:', error);
    return NextResponse.json({ error: 'Failed to fetch help articles' }, { status: 500 });
  }
}

// POST - Create a new help article
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, slug, category, content } = body;

    if (!title || !slug || !category || !content) {
      return NextResponse.json(
        { error: 'title, slug, category, and content are required' },
        { status: 400 },
      );
    }

    await dbConnect();

    // Check for duplicate slug
    const existing = await HelpArticle.findOne({ slug }).lean();
    if (existing) {
      return NextResponse.json({ error: 'An article with this slug already exists' }, { status: 409 });
    }

    const article = await HelpArticle.create(body);

    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    console.error('Error creating help article:', error);
    return NextResponse.json({ error: 'Failed to create help article' }, { status: 500 });
  }
}
