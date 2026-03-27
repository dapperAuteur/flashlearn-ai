import { NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb';

const FOUNDERS_LIMIT = 100;

/**
 * GET /api/pricing/founders
 * Public endpoint — returns founder's price availability.
 * Only counts users who actually paid (Stripe or verified CashApp).
 * Sample/manual/gifted users are excluded.
 *
 * If an active Lifetime promo campaign exists, the lifetime offer
 * is re-enabled even after the founder's cap is reached.
 */
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const now = new Date();

    const [stripePaid, cashAppVerified, activeLifetimePromo] = await Promise.all([
      db.collection('users').countDocuments({
        subscriptionTier: 'Lifetime Learner',
        stripeCustomerId: { $exists: true, $ne: null },
      }),
      db.collection('cashapppayments').countDocuments({
        status: 'verified',
      }),
      // Check for an active Lifetime promo campaign
      db.collection('promocampaigns').findOne({
        tier: 'Lifetime Learner',
        isActive: true,
        startDate: { $lte: now },
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } },
        ],
      }),
    ]);

    const count = stripePaid + cashAppVerified;
    const remaining = Math.max(0, FOUNDERS_LIMIT - count);
    const foundersActive = remaining > 0;

    // Lifetime is available if founders spots remain OR an admin promo is running
    const promoActive = !!activeLifetimePromo;
    const promoName = activeLifetimePromo?.name || null;
    const promoCap = activeLifetimePromo?.userCap || null;
    const promoRedemptions = activeLifetimePromo?.redemptions || 0;

    return NextResponse.json({
      limit: FOUNDERS_LIMIT,
      count,
      remaining,
      foundersActive,
      // Lifetime offer is live if founders OR promo is active
      active: foundersActive || promoActive,
      promo: promoActive
        ? {
            name: promoName,
            cap: promoCap,
            redemptions: promoRedemptions,
            remaining: promoCap ? Math.max(0, promoCap - promoRedemptions) : null,
          }
        : null,
    });
  } catch (error) {
    console.error('[pricing/founders] Error:', error);
    return NextResponse.json({
      limit: FOUNDERS_LIMIT,
      count: 0,
      remaining: FOUNDERS_LIMIT,
      foundersActive: true,
      active: true,
      promo: null,
    });
  }
}
