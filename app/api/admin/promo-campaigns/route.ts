import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { PromoCampaign } from '@/models/PromoCampaign';

// GET - List all promo campaigns
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();
    const campaigns = await PromoCampaign.find()
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('[admin/promo-campaigns] GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST - Create a promo campaign
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, tier, priceDisplay, priceCents, stripePriceId, cashAppNote, userCap, startDate, endDate } = body;

    if (!name || !tier || !priceDisplay || !priceCents || !userCap) {
      return NextResponse.json({ error: 'name, tier, priceDisplay, priceCents, and userCap are required' }, { status: 400 });
    }

    await dbConnect();

    const campaign = await PromoCampaign.create({
      name,
      tier,
      priceDisplay,
      priceCents,
      stripePriceId: stripePriceId || undefined,
      cashAppNote: cashAppNote || `Send ${priceDisplay} to $centenarian with your FlashLearnAI email`,
      userCap,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('[admin/promo-campaigns] POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH - Toggle campaign active status
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id, isActive } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await dbConnect();
    const campaign = await PromoCampaign.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('[admin/promo-campaigns] PATCH error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
