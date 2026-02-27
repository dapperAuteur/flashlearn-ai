import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import Stripe from 'stripe';
import dbConnect from '@/lib/db/dbConnect';
import { CouponTracker } from '@/models/CouponTracker';

const secret = process.env.NEXTAUTH_SECRET;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();

    const coupons = await CouponTracker.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Add redemption count to each coupon
    const couponsWithCount = coupons.map((coupon) => ({
      ...coupon,
      redemptionCount: coupon.redemptions?.length || 0,
    }));

    return NextResponse.json({ coupons: couponsWithCount });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      duration,
      durationInMonths,
      maxRedemptions,
      expiresAt,
    } = await request.json();

    // Validate required fields
    if (!code || !discountType || !discountValue || !duration) {
      return NextResponse.json(
        { error: 'code, discountType, discountValue, and duration are required' },
        { status: 400 }
      );
    }

    // Validate discount type
    if (!['percent_off', 'amount_off'].includes(discountType)) {
      return NextResponse.json(
        { error: 'discountType must be percent_off or amount_off' },
        { status: 400 }
      );
    }

    // Validate discount value
    if (discountType === 'percent_off' && (discountValue < 1 || discountValue > 100)) {
      return NextResponse.json(
        { error: 'Percentage discount must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (discountType === 'amount_off' && discountValue < 1) {
      return NextResponse.json(
        { error: 'Amount discount must be at least $1' },
        { status: 400 }
      );
    }

    // Validate duration
    if (!['once', 'repeating', 'forever'].includes(duration)) {
      return NextResponse.json(
        { error: 'duration must be once, repeating, or forever' },
        { status: 400 }
      );
    }

    if (duration === 'repeating' && (!durationInMonths || durationInMonths < 1)) {
      return NextResponse.json(
        { error: 'durationInMonths is required and must be at least 1 for repeating duration' },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    await dbConnect();

    // Check if code already exists locally
    const existing = await CouponTracker.findOne({ code: normalizedCode });
    if (existing) {
      return NextResponse.json(
        { error: 'A coupon with this code already exists' },
        { status: 409 }
      );
    }

    // Build Stripe coupon params
    const stripeCouponParams: Stripe.CouponCreateParams = {
      duration,
      ...(discountType === 'percent_off'
        ? { percent_off: discountValue }
        : { amount_off: Math.round(discountValue * 100), currency: 'usd' }),
      ...(duration === 'repeating' && durationInMonths
        ? { duration_in_months: durationInMonths }
        : {}),
      ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
      ...(expiresAt
        ? { redeem_by: Math.floor(new Date(expiresAt).getTime() / 1000) }
        : {}),
    };

    // Create Stripe coupon
    const stripeCoupon = await stripe.coupons.create(stripeCouponParams);

    // Create Stripe promotion code with the user-facing code
    const promoParams: Record<string, unknown> = {
      coupon: stripeCoupon.id,
      code: normalizedCode,
    };
    if (maxRedemptions) promoParams.max_redemptions = maxRedemptions;
    if (expiresAt) promoParams.expires_at = Math.floor(new Date(expiresAt).getTime() / 1000);

    const stripePromoCode = await stripe.promotionCodes.create(
      promoParams as unknown as Stripe.PromotionCodeCreateParams
    );

    // Store in local DB
    const couponTracker = await CouponTracker.create({
      stripeCouponId: stripeCoupon.id,
      stripePromoCodeId: stripePromoCode.id,
      code: normalizedCode,
      description: description || undefined,
      discountType,
      discountValue,
      duration,
      ...(duration === 'repeating' && durationInMonths ? { durationInMonths } : {}),
      ...(maxRedemptions ? { maxRedemptions } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      createdBy: token.id,
      isActive: true,
      redemptions: [],
    });

    return NextResponse.json({ coupon: couponTracker }, { status: 201 });
  } catch (error) {
    console.error('Error creating coupon:', error);

    // Handle Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
