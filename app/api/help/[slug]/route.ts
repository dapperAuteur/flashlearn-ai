import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { HelpArticle } from '@/models/HelpArticle';

interface Params {
  params: Promise<{ slug: string }>;
}

// GET - Get a single help article by slug
export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;

  try {
    await dbConnect();

    const article = await HelpArticle.findOne({ slug, isPublished: true }).lean();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Error fetching help article:', error);
    return NextResponse.json({ error: 'Failed to fetch help article' }, { status: 500 });
  }
}
