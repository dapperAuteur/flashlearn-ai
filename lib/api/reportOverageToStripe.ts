import Stripe from 'stripe';
import { User } from '@/models/User';
import { Logger, LogContext } from '@/lib/logging/logger';
import { type ApiTier } from '@/types/api';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

// Stripe Billing Meter event names (configured in Stripe dashboard)
// These map to meters that track overage usage per tier.
const OVERAGE_METER_MAP: Partial<Record<ApiTier, string | undefined>> = {
  Developer: process.env.STRIPE_API_DEVELOPER_METER_EVENT_NAME,
  Pro: process.env.STRIPE_API_PRO_METER_EVENT_NAME,
};

/**
 * Reports overage usage to Stripe via the Billing Meters API.
 * Called inline when an API generation call exceeds the monthly quota for Developer/Pro tiers.
 *
 * Stripe aggregates meter events and bills the customer at the end of the billing cycle.
 * If the meter event name is not configured, skips silently.
 *
 * To set up in Stripe Dashboard:
 * 1. Create a Billing Meter (e.g., "api_overage_developer")
 * 2. Attach the meter to a price on the API subscription product
 * 3. Set STRIPE_API_DEVELOPER_METER_EVENT_NAME=api_overage_developer in .env
 */
export async function reportOverageToStripe(
  userId: string,
  apiTier: ApiTier,
  quantity: number = 1
): Promise<void> {
  const meterEventName = OVERAGE_METER_MAP[apiTier];
  if (!meterEventName) {
    Logger.debug(LogContext.SYSTEM, `No overage meter configured for tier: ${apiTier}. Skipping Stripe report.`);
    return;
  }

  try {
    // Look up the user's Stripe customer ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await User.findById(userId)
      .select('stripeCustomerId')
      .lean();

    if (!user?.stripeCustomerId) {
      Logger.debug(LogContext.SYSTEM, 'User has no Stripe customer ID, cannot report overage.', { userId });
      return;
    }

    // Send a meter event to Stripe Billing
    await stripe.billing.meterEvents.create({
      event_name: meterEventName,
      payload: {
        stripe_customer_id: user.stripeCustomerId,
        value: String(quantity),
      },
    });

    Logger.info(LogContext.SYSTEM, `Reported ${quantity} overage unit(s) to Stripe meter.`, {
      userId,
      metadata: { apiTier, meterEventName },
    });
  } catch (error) {
    // Non-fatal: log and continue. The API call should still succeed.
    Logger.error(LogContext.SYSTEM, 'Failed to report overage to Stripe.', {
      userId,
      metadata: { apiTier, error },
    });
  }
}
