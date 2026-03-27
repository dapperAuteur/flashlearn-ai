import { NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb';

const FOUNDERS_LIMIT = 100;

/**
 * GET /api/pricing/founders
 * Public endpoint — returns founder's price availability.
 * Only counts users who actually paid (Stripe or verified CashApp).
 * Sample/manual/gifted users are excluded.
 */
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const [stripePaid, cashAppVerified] = await Promise.all([
      // Stripe-paid lifetime users
      db.collection('users').countDocuments({
        subscriptionTier: 'Lifetime Learner',
        stripeCustomerId: { $exists: true, $ne: null },
      }),
      // CashApp-verified lifetime payments
      db.collection('cashapppayments').countDocuments({
        status: 'verified',
      }),
    ]);

    const count = stripePaid + cashAppVerified;
    const remaining = Math.max(0, FOUNDERS_LIMIT - count);

    return NextResponse.json({
      limit: FOUNDERS_LIMIT,
      count,
      remaining,
      active: remaining > 0,
    });
  } catch (error) {
    console.error('[pricing/founders] Error:', error);
    return NextResponse.json({
      limit: FOUNDERS_LIMIT,
      count: 0,
      remaining: FOUNDERS_LIMIT,
      active: true,
    });
  }
}
