import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
import { AppConfig, IAppConfig } from '@/models/AppConfig';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();
    const featured = await FlashcardSet.find({ isFeatured: true })
      .select('title description cardCount source categories isFeatured featuredOrder createdAt')
      .populate('categories', 'name slug color')
      .sort({ featuredOrder: 1 })
      .lean();

    return NextResponse.json({
      featured: featured.map((s) => ({
        id: String(s._id),
        title: s.title,
        description: s.description || '',
        cardCount: s.cardCount,
        source: s.source,
        categories: s.categories || [],
        featuredOrder: s.featuredOrder || 0,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error fetching featured sets', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { setId, featuredOrder } = await request.json();
    if (!setId) {
      return NextResponse.json({ error: 'setId is required' }, { status: 400 });
    }

    await dbConnect();

    // Check max featured limit
    const maxConfig = await AppConfig.findOne({ key: 'MAX_FEATURED_SETS' }).lean<IAppConfig>();
    const maxFeatured = (maxConfig?.value as number) || 10;
    const currentCount = await FlashcardSet.countDocuments({ isFeatured: true });

    if (currentCount >= maxFeatured) {
      return NextResponse.json(
        { error: `Maximum of ${maxFeatured} featured sets allowed` },
        { status: 400 }
      );
    }

    const set = await FlashcardSet.findById(setId);
    if (!set) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }
    if (!set.isPublic) {
      return NextResponse.json({ error: 'Only public sets can be featured' }, { status: 400 });
    }

    set.isFeatured = true;
    set.featuredOrder = featuredOrder ?? currentCount;
    await set.save();

    Logger.info(LogContext.SYSTEM, `Admin featured set: ${set.title}`, {
      adminId: token.id,
      setId,
    });

    return NextResponse.json({ message: 'Set featured successfully' }, { status: 201 });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error featuring set', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
