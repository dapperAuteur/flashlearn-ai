import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import Stripe from 'stripe';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const PRICE_MAP: Record<string, string | undefined> = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_9_99_MONTHLY_PRICE,
  annual: process.env.NEXT_PUBLIC_STRIPE_99_99_ANNUAL_PRICE,
  lifetime: process.env.NEXT_PUBLIC_STRIPE_499_99_LIFETIME_PRICE,
};

const TIER_MAP: Record<string, string> = {
  monthly: 'Monthly Pro',
  annual: 'Annual Pro',
  lifetime: 'Lifetime Learner',
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { plan } = await request.json();

    if (!plan || !PRICE_MAP[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = PRICE_MAP[plan];
    if (!priceId || priceId === 'price_...') {
      return NextResponse.json(
        { error: 'Stripe price not configured. Please contact support.' },
        { status: 500 },
      );
    }

    await dbConnect();
    const user = await User.findById(session.user.id).select('stripeCustomerId email name subscriptionTier');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't allow upgrade if already on a paid plan
    if (user.subscriptionTier && user.subscriptionTier !== 'Free') {
      return NextResponse.json(
        { error: 'You already have an active subscription. Manage it from your account settings.' },
        { status: 400 },
      );
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const isLifetime = plan === 'lifetime';
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: isLifetime ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pricing?success=true&plan=${plan}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        userId: session.user.id,
        plan,
        tier: TIER_MAP[plan],
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
