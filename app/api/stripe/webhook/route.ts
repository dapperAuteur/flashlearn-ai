import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
import { RevenueEvent } from '@/models/RevenueEvent';
import { CouponTracker } from '@/models/CouponTracker';
import { Logger, LogContext } from '@/lib/logging/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    Logger.error(LogContext.SYSTEM, 'Stripe webhook signature verification failed', { error: message });
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  await dbConnect();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;

        if (!userId || !tier) {
          Logger.warning(LogContext.SYSTEM, 'Checkout completed but missing metadata', { sessionId: session.id });
          break;
        }

        const updateData: Record<string, unknown> = {
          subscriptionTier: tier,
        };

        // Store subscription ID for recurring plans
        if (session.subscription) {
          updateData.stripeSubscriptionId = session.subscription;
        }

        await User.findByIdAndUpdate(userId, updateData);
        Logger.info(LogContext.SYSTEM, 'User subscription updated after checkout', { userId, tier });

        // Record revenue event
        try {
          await RevenueEvent.updateOne(
            { stripeEventId: event.id },
            {
              $setOnInsert: {
                userId,
                stripeCustomerId: session.customer as string || undefined,
                eventType: 'subscription_created',
                newTier: tier,
                amountCents: session.amount_total || 0,
                currency: session.currency || 'usd',
                stripeEventId: event.id,
              },
            },
            { upsert: true }
          );
        } catch (revenueErr) {
          Logger.warning(LogContext.SYSTEM, 'Failed to record revenue event for checkout', { error: revenueErr });
        }

        // Track coupon redemption
        const sessionAny = session as unknown as Record<string, unknown>;
        const sessionDiscount = sessionAny.discount as { promotion_code?: string | { id: string } } | undefined;
        if (sessionDiscount?.promotion_code) {
          try {
            const promoCodeId = typeof sessionDiscount.promotion_code === 'string'
              ? sessionDiscount.promotion_code
              : sessionDiscount.promotion_code.id;
            await CouponTracker.updateOne(
              { stripePromoCodeId: promoCodeId },
              { $push: { redemptions: { userId, redeemedAt: new Date(), subscriptionTier: tier } } }
            );
          } catch (couponErr) {
            Logger.warning(LogContext.SYSTEM, 'Failed to track coupon redemption', { error: couponErr });
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const user = await User.findOne({ stripeCustomerId: customerId });

        if (!user) {
          Logger.warning(LogContext.SYSTEM, 'Subscription updated but user not found', { customerId });
          break;
        }

        // If subscription becomes active, ensure tier is set
        if (subscription.status === 'active') {
          // Determine tier from price
          const priceId = subscription.items.data[0]?.price?.id;
          let newTier = 'Monthly Pro';
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_99_99_ANNUAL_PRICE) {
            newTier = 'Annual Pro';
          }

          const previousTier = user.subscriptionTier;
          user.subscriptionTier = newTier;
          await user.save();
          Logger.info(LogContext.SYSTEM, 'Subscription activated', { userId: user._id, tier: newTier });

          // Record revenue event (upgraded or downgraded)
          if (previousTier !== newTier) {
            const tierRank: Record<string, number> = { 'Free': 0, 'Monthly Pro': 1, 'Annual Pro': 2, 'Lifetime Learner': 3 };
            const eventType = (tierRank[newTier] || 0) >= (tierRank[previousTier] || 0) ? 'upgraded' : 'downgraded';
            const amountCents = newTier === 'Annual Pro' ? 9999 : 999;

            try {
              await RevenueEvent.updateOne(
                { stripeEventId: event.id },
                {
                  $setOnInsert: {
                    userId: user._id,
                    stripeCustomerId: customerId,
                    eventType,
                    previousTier,
                    newTier,
                    amountCents,
                    currency: 'usd',
                    stripeEventId: event.id,
                  },
                },
                { upsert: true }
              );
            } catch (revenueErr) {
              Logger.warning(LogContext.SYSTEM, 'Failed to record revenue event for subscription update', { error: revenueErr });
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const user = await User.findOne({ stripeCustomerId: customerId });

        if (!user) {
          Logger.warning(LogContext.SYSTEM, 'Subscription deleted but user not found', { customerId });
          break;
        }

        // Only downgrade if currently on a recurring plan (not lifetime)
        if (user.subscriptionTier !== 'Lifetime Learner') {
          const previousTier = user.subscriptionTier;
          user.subscriptionTier = 'Free';
          await user.save();
          Logger.info(LogContext.SYSTEM, 'User downgraded to Free after subscription cancellation', { userId: user._id });

          // Record revenue event
          try {
            await RevenueEvent.updateOne(
              { stripeEventId: event.id },
              {
                $setOnInsert: {
                  userId: user._id,
                  stripeCustomerId: customerId,
                  eventType: 'canceled',
                  previousTier,
                  newTier: 'Free',
                  amountCents: 0,
                  currency: 'usd',
                  stripeEventId: event.id,
                },
              },
              { upsert: true }
            );
          } catch (revenueErr) {
            Logger.warning(LogContext.SYSTEM, 'Failed to record revenue event for cancellation', { error: revenueErr });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        Logger.warning(LogContext.SYSTEM, 'Invoice payment failed', { customerId, invoiceId: invoice.id });

        // Record revenue event
        try {
          const failedUser = await User.findOne({ stripeCustomerId: customerId });
          await RevenueEvent.updateOne(
            { stripeEventId: event.id },
            {
              $setOnInsert: {
                userId: failedUser?._id || undefined,
                stripeCustomerId: customerId,
                eventType: 'payment_failed',
                amountCents: invoice.amount_due || 0,
                currency: invoice.currency || 'usd',
                stripeEventId: event.id,
              },
            },
            { upsert: true }
          );
        } catch (revenueErr) {
          Logger.warning(LogContext.SYSTEM, 'Failed to record revenue event for payment failure', { error: revenueErr });
        }

        break;
      }

      default:
        Logger.debug(LogContext.SYSTEM, `Unhandled Stripe event: ${event.type}`);
    }
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error processing Stripe webhook', { eventType: event.type, error });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
