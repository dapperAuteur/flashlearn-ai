import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import Stripe from 'stripe';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
import { ApiKey } from '@/models/ApiKey';
import { Logger, LogContext } from '@/lib/logging/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

// API-specific price IDs (separate products from consumer subscriptions)
const API_PRICE_MAP: Record<string, string | undefined> = {
  developer: process.env.STRIPE_API_DEVELOPER_PRICE_ID,
  pro: process.env.STRIPE_API_PRO_PRICE_ID,
};

const API_TIER_MAP: Record<string, string> = {
  developer: 'Developer',
  pro: 'Pro',
};

/**
 * POST /api/v1/billing/checkout
 * Creates a Stripe checkout session for an API subscription (Developer or Pro tier).
 * Uses session auth (called from the developer portal UI, not via API key).
 * Body: { plan: 'developer' | 'pro', apiKeyId?: string }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { plan, apiKeyId } = await request.json();

    if (!plan || !API_PRICE_MAP[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "developer" or "pro".' },
        { status: 400 }
      );
    }

    const priceId = API_PRICE_MAP[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: 'API subscription price not configured. Contact support.' },
        { status: 500 }
      );
    }

    await dbConnect();
    const user = await User.findById(session.user.id).select('stripeCustomerId email name');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If apiKeyId provided, verify ownership and that it's a public key
    if (apiKeyId) {
      const key = await ApiKey.findOne({ _id: apiKeyId, userId: session.user.id, keyType: 'public' });
      if (!key) {
        return NextResponse.json({ error: 'API key not found or not a public key.' }, { status: 404 });
      }
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

    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/developer/billing?success=true&plan=${plan}`,
      cancel_url: `${origin}/developer/billing?canceled=true`,
      metadata: {
        userId: session.user.id,
        plan,
        apiTier: API_TIER_MAP[plan],
        apiKeyId: apiKeyId || '',
        isApiSubscription: 'true',
      },
    });

    Logger.info(LogContext.SYSTEM, 'API checkout session created.', {
      userId: session.user.id,
      metadata: { plan, apiTier: API_TIER_MAP[plan] },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'API Stripe checkout error', { error });
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
