import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { Promotion } from '@/models/Promotion';
import { clearPromotionsCache } from '@/lib/promo/promotions';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

interface Params {
  params: Promise<{ slug: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { slug } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim();
  if (typeof body.flatLimit === 'number' && body.flatLimit >= 1) update.flatLimit = body.flatLimit;
  if (body.startsAt !== undefined) {
    const ms = new Date(body.startsAt).getTime();
    if (Number.isNaN(ms)) {
      return NextResponse.json({ error: 'startsAt must be a valid ISO 8601 date.' }, { status: 400 });
    }
    update.startsAt = new Date(ms);
  }
  if (body.endsAt !== undefined) {
    const ms = new Date(body.endsAt).getTime();
    if (Number.isNaN(ms)) {
      return NextResponse.json({ error: 'endsAt must be a valid ISO 8601 date.' }, { status: 400 });
    }
    update.endsAt = new Date(ms);
  }
  if (typeof body.active === 'boolean') update.active = body.active;
  if (typeof body.bannerMessage === 'string') update.bannerMessage = body.bannerMessage;
  if (typeof body.bannerLink === 'string') update.bannerLink = body.bannerLink || undefined;
  if (typeof body.bannerLinkLabel === 'string') update.bannerLinkLabel = body.bannerLinkLabel || undefined;
  if (typeof body.pricingCallout === 'string') update.pricingCallout = body.pricingCallout;
  if (typeof body.pricingTierBadge === 'string') update.pricingTierBadge = body.pricingTierBadge;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const updated = await Promotion.findOneAndUpdate({ slug }, { $set: update }, { new: true });
    if (!updated) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    // If startsAt > endsAt after the patch, revert and reject.
    if (updated.startsAt.getTime() >= updated.endsAt.getTime()) {
      await Promotion.findOneAndUpdate(
        { slug },
        {
          $set: {
            startsAt: update.startsAt ? undefined : updated.startsAt,
            endsAt: update.endsAt ? undefined : updated.endsAt,
          },
        },
      );
      return NextResponse.json({ error: 'endsAt must be after startsAt.' }, { status: 400 });
    }

    clearPromotionsCache();

    Logger.info(LogContext.SYSTEM, `Admin updated promotion: ${slug}`, { adminId: token.id, slug });
    return NextResponse.json({ promotion: updated });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to update promotion', { error });
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { slug } = await params;

  try {
    await dbConnect();
    const deleted = await Promotion.findOneAndDelete({ slug });
    if (!deleted) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    clearPromotionsCache();

    Logger.info(LogContext.SYSTEM, `Admin deleted promotion: ${slug}`, { adminId: token.id, slug });
    return NextResponse.json({ ok: true });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to delete promotion', { error });
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }
}
