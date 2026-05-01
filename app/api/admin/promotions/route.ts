import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { Promotion } from '@/models/Promotion';
import { clearPromotionsCache } from '@/lib/promo/promotions';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();
    const promotions = await Promotion.find({}).sort({ startsAt: -1 }).lean();
    return NextResponse.json({ promotions });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to list promotions', { error });
    return NextResponse.json({ error: 'Failed to list promotions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    slug,
    name,
    flatLimit,
    startsAt,
    endsAt,
    active,
    bannerMessage,
    bannerLink,
    bannerLinkLabel,
    pricingCallout,
    pricingTierBadge,
  } = body ?? {};

  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    return NextResponse.json(
      { error: 'Slug is required and may only contain lowercase letters, numbers, and hyphens.' },
      { status: 400 },
    );
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }
  if (typeof flatLimit !== 'number' || flatLimit < 1 || !Number.isFinite(flatLimit)) {
    return NextResponse.json({ error: 'flatLimit must be a positive number.' }, { status: 400 });
  }
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return NextResponse.json({ error: 'startsAt and endsAt must be valid ISO 8601 dates.' }, { status: 400 });
  }
  if (endMs <= startMs) {
    return NextResponse.json({ error: 'endsAt must be after startsAt.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const existing = await Promotion.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: 'A promotion with that slug already exists.' }, { status: 409 });
    }

    const created = await Promotion.create({
      slug,
      name: name.trim(),
      flatLimit,
      startsAt: new Date(startMs),
      endsAt: new Date(endMs),
      active: active !== false,
      bannerMessage: bannerMessage ?? '',
      bannerLink: bannerLink || undefined,
      bannerLinkLabel: bannerLinkLabel || undefined,
      pricingCallout: pricingCallout ?? '',
      pricingTierBadge: pricingTierBadge ?? '',
      createdBy: token.id,
    });

    clearPromotionsCache();

    Logger.info(LogContext.SYSTEM, `Admin created promotion: ${slug}`, { adminId: token.id, slug });
    return NextResponse.json({ promotion: created }, { status: 201 });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to create promotion', { error });
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }
}
