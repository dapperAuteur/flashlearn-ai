import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Stripe from 'stripe';
import dbConnect from '@/lib/db/dbConnect';
import { CouponTracker } from '@/models/CouponTracker';

const secret = process.env.NEXTAUTH_SECRET;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

export async function GET(
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

    const coupon = await CouponTracker.findById(id)
      .populate('redemptions.userId', 'name email')
      .lean();

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('Error fetching coupon:', error);
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

    const coupon = await CouponTracker.findById(id);
    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    if (!coupon.isActive) {
      return NextResponse.json(
        { error: 'Coupon is already inactive' },
        { status: 400 }
      );
    }

    // Deactivate the promotion code in Stripe
    try {
      await stripe.promotionCodes.update(coupon.stripePromoCodeId, {
        active: false,
      });
    } catch (stripeErr) {
      console.error('Failed to deactivate Stripe promo code:', stripeErr);
      // Continue with local deactivation even if Stripe fails
    }

    // Deactivate locally
    coupon.isActive = false;
    await coupon.save();

    return NextResponse.json({ message: 'Coupon deactivated', coupon });
  } catch (error) {
    console.error('Error deactivating coupon:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
