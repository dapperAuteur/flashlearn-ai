import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
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
          let tier = 'Monthly Pro';
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_99_99_ANNUAL_PRICE) {
            tier = 'Annual Pro';
          }
          user.subscriptionTier = tier;
          await user.save();
          Logger.info(LogContext.SYSTEM, 'Subscription activated', { userId: user._id, tier });
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
          user.subscriptionTier = 'Free';
          await user.save();
          Logger.info(LogContext.SYSTEM, 'User downgraded to Free after subscription cancellation', { userId: user._id });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        Logger.warning(LogContext.SYSTEM, 'Invoice payment failed', { customerId, invoiceId: invoice.id });
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
