/**
 * @jest-environment node
 *
 * POST /api/stripe/webhook
 *
 * This is the one endpoint in the app where an unauthenticated request can hand
 * somebody a paid subscription, so the signature check gets the most attention
 * here. Signatures are produced by the real Stripe SDK helper
 * (`Stripe.webhooks.generateTestHeaderString`) and verified by the real
 * `constructEvent`, which is pure HMAC and never touches the network. Nothing in
 * this suite reaches a Stripe server and no real key is used.
 *
 * Mongo runs in memory so the subscription state transitions can be asserted on
 * the stored documents rather than on a mock.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
// Both of these run code at import time that demands MONGODB_URI, which this
// suite supplies through mongodb-memory-server instead.
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    debug: jest.fn(async () => null),
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { SYSTEM: 'system' },
}));

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { User } from '@/models/User';
import { RevenueEvent } from '@/models/RevenueEvent';
import { CouponTracker } from '@/models/CouponTracker';
import { ApiKey } from '@/models/ApiKey';

const WEBHOOK_SECRET = 'whsec_flashlearn_test_secret';
const ANNUAL_PRICE = 'price_annual_test';
const MONTHLY_PRICE = 'price_monthly_test';

let mongod: MongoMemoryServer;
let POST: typeof import('../../../app/api/stripe/webhook/route').POST;

beforeAll(async () => {
  // The route builds its Stripe client and reads the signing secret at module
  // load, so the env has to be in place before the dynamic import below.
  process.env.STRIPE_SECRET_KEY = 'sk_test_not_a_real_key';
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.NEXT_PUBLIC_STRIPE_100_ANNUAL_PRICE = ANNUAL_PRICE;

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  ({ POST } = await import('../../../app/api/stripe/webhook/route'));
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  await Promise.all([
    User.deleteMany({}),
    RevenueEvent.deleteMany({}),
    CouponTracker.deleteMany({}),
    ApiKey.deleteMany({}),
  ]);
});

let seq = 0;

async function makeUser(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return User.create({
    name: `Payer ${seq}`,
    email: `payer${seq}@example.com`,
    password: 'x',
    ...overrides,
  });
}

async function makeApiKey(userId: Types.ObjectId, overrides: Record<string, unknown> = {}) {
  seq += 1;
  return ApiKey.create({
    userId,
    name: `Key ${seq}`,
    keyType: 'public',
    keyPrefix: `pk_test_${seq}`,
    keyHash: `hash_${seq}`,
    apiTier: 'Free',
    status: 'active',
    ...overrides,
  });
}

function sign(payload: string): string {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
}

/**
 * Builds the request the route sees. `signature: null` omits the header entirely;
 * any other string is sent verbatim so forged values can be exercised.
 */
function webhookRequest(
  event: Record<string, unknown>,
  opts: { signature?: string | null; body?: string } = {},
) {
  const payload = JSON.stringify(event);
  const body = opts.body ?? payload;
  const headers = new Headers({ 'content-type': 'application/json' });

  const signature = 'signature' in opts ? opts.signature : sign(payload);
  if (typeof signature === 'string') headers.set('stripe-signature', signature);

  return new NextRequest('https://flashlearnai.witus.online/api/stripe/webhook', {
    method: 'POST',
    body,
    headers,
  });
}

function checkoutCompleted(
  metadata: Record<string, string>,
  extra: Record<string, unknown> = {},
  eventId = `evt_${Date.now()}_${seq}`,
) {
  return {
    id: eventId,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        object: 'checkout.session',
        customer: 'cus_test_1',
        amount_total: 999,
        currency: 'usd',
        metadata,
        ...extra,
      },
    },
  };
}

function subscriptionEvent(
  type: 'customer.subscription.updated' | 'customer.subscription.deleted',
  customer: string,
  overrides: Record<string, unknown> = {},
  eventId = `evt_${Date.now()}_${seq}`,
) {
  return {
    id: eventId,
    object: 'event',
    type,
    data: {
      object: {
        id: 'sub_test_1',
        object: 'subscription',
        customer,
        status: 'active',
        items: { data: [{ price: { id: MONTHLY_PRICE } }] },
        ...overrides,
      },
    },
  };
}

async function readJson(res: Response) {
  return (await res.json()) as { error?: string; received?: boolean };
}

describe('POST /api/stripe/webhook: signature verification', () => {
  it('rejects a request with no stripe-signature header', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    const event = checkoutCompleted({ userId: String(user._id), tier: 'Lifetime Learner' });

    const res = await POST(webhookRequest(event, { signature: null }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('Missing signature');
    expect((await User.findById(user._id))!.subscriptionTier).toBe('Free');
  });

  it('rejects a forged signature and grants nothing', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    const event = checkoutCompleted({ userId: String(user._id), tier: 'Lifetime Learner' });

    const res = await POST(
      webhookRequest(event, { signature: 't=1700000000,v1=deadbeefdeadbeefdeadbeefdeadbeef' }),
    );

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/^Webhook Error:/);
    expect((await User.findById(user._id))!.subscriptionTier).toBe('Free');
    expect(await RevenueEvent.countDocuments({})).toBe(0);
  });

  it('rejects a signature generated with a different secret', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    const event = checkoutCompleted({ userId: String(user._id), tier: 'Annual Pro' });
    const payload = JSON.stringify(event);
    const foreign = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_attacker' });

    const res = await POST(webhookRequest(event, { signature: foreign }));

    expect(res.status).toBe(400);
    expect((await User.findById(user._id))!.subscriptionTier).toBe('Free');
  });

  it('rejects a body edited after it was signed', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    const honest = checkoutCompleted({ userId: String(user._id), tier: 'Monthly Pro' });
    const signature = sign(JSON.stringify(honest));
    const tampered = JSON.stringify(
      checkoutCompleted({ userId: String(user._id), tier: 'Lifetime Learner' }),
    );

    const res = await POST(webhookRequest(honest, { signature, body: tampered }));

    expect(res.status).toBe(400);
    expect((await User.findById(user._id))!.subscriptionTier).toBe('Free');
  });

  it('accepts a correctly signed event', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    const event = checkoutCompleted({ userId: String(user._id), tier: 'Monthly Pro' });

    const res = await POST(webhookRequest(event));

    expect(res.status).toBe(200);
    expect((await readJson(res)).received).toBe(true);
  });
});

describe('POST /api/stripe/webhook: checkout.session.completed', () => {
  it('sets the tier and stores the subscription id', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    const event = checkoutCompleted(
      { userId: String(user._id), tier: 'Annual Pro' },
      { subscription: 'sub_abc123', amount_total: 9999 },
    );

    await POST(webhookRequest(event));

    const stored = await User.findById(user._id);
    expect(stored!.subscriptionTier).toBe('Annual Pro');
    expect(stored!.stripeSubscriptionId).toBe('sub_abc123');
  });

  it('records exactly one revenue event', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    const event = checkoutCompleted({ userId: String(user._id), tier: 'Monthly Pro' });

    await POST(webhookRequest(event));

    const events = await RevenueEvent.find({});
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('subscription_created');
    expect(events[0].newTier).toBe('Monthly Pro');
    expect(events[0].amountCents).toBe(999);
  });

  it('ignores an event whose metadata carries no tier', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    const event = checkoutCompleted({ userId: String(user._id) });

    const res = await POST(webhookRequest(event));

    expect(res.status).toBe(200);
    expect((await User.findById(user._id))!.subscriptionTier).toBe('Free');
    expect(await RevenueEvent.countDocuments({})).toBe(0);
  });

  it('ignores an event whose metadata carries no userId', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    const event = checkoutCompleted({ tier: 'Lifetime Learner' });

    const res = await POST(webhookRequest(event));

    expect(res.status).toBe(200);
    expect((await User.findById(user._id))!.subscriptionTier).toBe('Free');
  });

  /**
   * FINDING, not a fix. app/api/stripe/webhook/route.ts:100-109 writes
   * `session.metadata.tier` straight onto the user with findByIdAndUpdate, which
   * does not run schema validators by default, so the subscriptionTier enum in
   * models/User.ts:54-58 never applies. Nothing checks the tier against the price
   * that was actually paid either. It is not reachable today because both
   * checkout routes derive the metadata server-side, but the webhook itself has
   * no second line of defence. Asserting the current behaviour so a future
   * validation pass has to update this test on purpose.
   */
  it('writes any tier string the event metadata carries, with no enum check', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    const event = checkoutCompleted({ userId: String(user._id), tier: 'Galaxy Brain Unlimited' });

    await POST(webhookRequest(event));

    expect((await User.findById(user._id))!.subscriptionTier).toBe('Galaxy Brain Unlimited');
  });
});

describe('POST /api/stripe/webhook: replaying the same event', () => {
  it('does not double-count revenue when the same event id arrives twice', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    const event = checkoutCompleted({ userId: String(user._id), tier: 'Monthly Pro' }, {}, 'evt_replay_1');

    await POST(webhookRequest(event));
    const second = await POST(webhookRequest(event));

    expect(second.status).toBe(200);
    expect(await RevenueEvent.countDocuments({})).toBe(1);
    expect((await User.findById(user._id))!.subscriptionTier).toBe('Monthly Pro');
  });

  /**
   * FINDING, not a fix. The route has no event-level replay guard; the only
   * dedupe is the unique stripeEventId index on RevenueEvent
   * (models/RevenueEvent.ts:41-45), and the coupon write at
   * app/api/stripe/webhook/route.ts:141-144 sits outside it. A replayed
   * checkout.session.completed therefore pushes a second redemption row for the
   * same purchase, which inflates coupon redemption counts and any
   * maxRedemptions logic built on them. Current behaviour asserted below.
   */
  it('pushes a duplicate coupon redemption on replay', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    await CouponTracker.create({
      stripeCouponId: 'coupon_1',
      stripePromoCodeId: 'promo_1',
      code: 'BACK2SCHOOL',
      discountType: 'percent_off',
      discountValue: 20,
      duration: 'once',
      createdBy: new Types.ObjectId(),
    });
    const event = checkoutCompleted(
      { userId: String(user._id), tier: 'Monthly Pro' },
      { discount: { promotion_code: 'promo_1' } },
      'evt_replay_coupon',
    );

    await POST(webhookRequest(event));
    await POST(webhookRequest(event));

    const tracker = await CouponTracker.findOne({ stripePromoCodeId: 'promo_1' });
    expect(tracker!.redemptions).toHaveLength(2);
  });

  it('records a single coupon redemption for a single delivery', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_test_1' });
    await CouponTracker.create({
      stripeCouponId: 'coupon_2',
      stripePromoCodeId: 'promo_2',
      code: 'FINALS25',
      discountType: 'percent_off',
      discountValue: 25,
      duration: 'once',
      createdBy: new Types.ObjectId(),
    });
    const event = checkoutCompleted(
      { userId: String(user._id), tier: 'Annual Pro' },
      { discount: { promotion_code: { id: 'promo_2' } } },
      'evt_coupon_once',
    );

    await POST(webhookRequest(event));

    const tracker = await CouponTracker.findOne({ stripePromoCodeId: 'promo_2' });
    expect(tracker!.redemptions).toHaveLength(1);
    expect(tracker!.redemptions[0].subscriptionTier).toBe('Annual Pro');
  });
});

describe('POST /api/stripe/webhook: subscription lifecycle', () => {
  it('activates the annual tier when the price matches the annual price id', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_annual' });
    const event = subscriptionEvent('customer.subscription.updated', 'cus_annual', {
      items: { data: [{ price: { id: ANNUAL_PRICE } }] },
    }, 'evt_sub_annual');

    await POST(webhookRequest(event));

    expect((await User.findById(user._id))!.subscriptionTier).toBe('Annual Pro');
    const revenue = await RevenueEvent.findOne({ stripeEventId: 'evt_sub_annual' });
    expect(revenue!.eventType).toBe('upgraded');
    expect(revenue!.amountCents).toBe(9999);
  });

  it('falls back to the monthly tier for any other price id', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_monthly' });
    const event = subscriptionEvent('customer.subscription.updated', 'cus_monthly', {}, 'evt_sub_monthly');

    await POST(webhookRequest(event));

    expect((await User.findById(user._id))!.subscriptionTier).toBe('Monthly Pro');
  });

  it('records a downgrade when the new tier ranks below the old one', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_down', subscriptionTier: 'Annual Pro' });
    const event = subscriptionEvent('customer.subscription.updated', 'cus_down', {}, 'evt_sub_down');

    await POST(webhookRequest(event));

    expect((await User.findById(user._id))!.subscriptionTier).toBe('Monthly Pro');
    expect((await RevenueEvent.findOne({ stripeEventId: 'evt_sub_down' }))!.eventType).toBe('downgraded');
  });

  it('writes no revenue event when the tier does not move', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_same', subscriptionTier: 'Monthly Pro' });
    const event = subscriptionEvent('customer.subscription.updated', 'cus_same', {}, 'evt_sub_same');

    await POST(webhookRequest(event));

    expect((await User.findById(user._id))!.subscriptionTier).toBe('Monthly Pro');
    expect(await RevenueEvent.countDocuments({})).toBe(0);
  });

  it('leaves the tier alone while the subscription is past_due', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_pastdue', subscriptionTier: 'Free' });
    const event = subscriptionEvent('customer.subscription.updated', 'cus_pastdue', {
      status: 'past_due',
    }, 'evt_sub_pastdue');

    const res = await POST(webhookRequest(event));

    expect(res.status).toBe(200);
    expect((await User.findById(user._id))!.subscriptionTier).toBe('Free');
  });

  it('accepts a subscription event for an unknown customer without failing', async () => {
    const event = subscriptionEvent('customer.subscription.updated', 'cus_nobody', {}, 'evt_sub_nobody');

    const res = await POST(webhookRequest(event));

    expect(res.status).toBe(200);
    expect(await RevenueEvent.countDocuments({})).toBe(0);
  });

  it('downgrades a recurring subscriber to Free on cancellation', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_cancel', subscriptionTier: 'Monthly Pro' });
    const event = subscriptionEvent('customer.subscription.deleted', 'cus_cancel', {}, 'evt_cancel');

    await POST(webhookRequest(event));

    expect((await User.findById(user._id))!.subscriptionTier).toBe('Free');
    const revenue = await RevenueEvent.findOne({ stripeEventId: 'evt_cancel' });
    expect(revenue!.eventType).toBe('canceled');
    expect(revenue!.previousTier).toBe('Monthly Pro');
  });

  it('keeps a Lifetime Learner on cancellation', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_life', subscriptionTier: 'Lifetime Learner' });
    const event = subscriptionEvent('customer.subscription.deleted', 'cus_life', {}, 'evt_cancel_life');

    await POST(webhookRequest(event));

    expect((await User.findById(user._id))!.subscriptionTier).toBe('Lifetime Learner');
    expect(await RevenueEvent.countDocuments({})).toBe(0);
  });

  it('records a failed invoice against the matching customer', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_failed' });
    const event = {
      id: 'evt_failed',
      object: 'event',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_test_1',
          object: 'invoice',
          customer: 'cus_failed',
          amount_due: 1299,
          currency: 'usd',
        },
      },
    };

    const res = await POST(webhookRequest(event));

    expect(res.status).toBe(200);
    const revenue = await RevenueEvent.findOne({ stripeEventId: 'evt_failed' });
    expect(revenue!.eventType).toBe('payment_failed');
    expect(revenue!.amountCents).toBe(1299);
    expect(String(revenue!.userId)).toBe(String(user._id));
    // A failed payment does not change what the user is entitled to today.
    expect((await User.findById(user._id))!.subscriptionTier).toBe('Free');
  });

  it('acknowledges an event type it does not handle', async () => {
    const event = {
      id: 'evt_unhandled',
      object: 'event',
      type: 'customer.updated',
      data: { object: { id: 'cus_x', object: 'customer' } },
    };

    const res = await POST(webhookRequest(event));

    expect(res.status).toBe(200);
    expect((await readJson(res)).received).toBe(true);
    expect(await RevenueEvent.countDocuments({})).toBe(0);
  });
});

describe('POST /api/stripe/webhook: API subscription checkout', () => {
  it("upgrades only the buyer's active public keys", async () => {
    const buyer = await makeUser({ stripeCustomerId: 'cus_api' });
    const other = await makeUser({ stripeCustomerId: 'cus_other' });
    const mine = await makeApiKey(buyer._id);
    const revoked = await makeApiKey(buyer._id, { status: 'revoked' });
    const internal = await makeApiKey(buyer._id, { keyType: 'app' });
    const theirs = await makeApiKey(other._id);

    const event = checkoutCompleted(
      { userId: String(buyer._id), apiTier: 'Pro', isApiSubscription: 'true' },
      { amount_total: 4900 },
      'evt_api_1',
    );

    await POST(webhookRequest(event));

    expect((await ApiKey.findById(mine._id))!.apiTier).toBe('Pro');
    expect((await ApiKey.findById(revoked._id))!.apiTier).toBe('Free');
    expect((await ApiKey.findById(internal._id))!.apiTier).toBe('Free');
    expect((await ApiKey.findById(theirs._id))!.apiTier).toBe('Free');
    // The API branch must not touch the consumer subscription tier.
    expect((await User.findById(buyer._id))!.subscriptionTier).toBe('Free');
  });

  it('upgrades only the named key when apiKeyId is present', async () => {
    const buyer = await makeUser({ stripeCustomerId: 'cus_api2' });
    const target = await makeApiKey(buyer._id);
    const untouched = await makeApiKey(buyer._id);

    const event = checkoutCompleted(
      {
        userId: String(buyer._id),
        apiTier: 'Developer',
        apiKeyId: String(target._id),
        isApiSubscription: 'true',
      },
      {},
      'evt_api_2',
    );

    await POST(webhookRequest(event));

    expect((await ApiKey.findById(target._id))!.apiTier).toBe('Developer');
    expect((await ApiKey.findById(untouched._id))!.apiTier).toBe('Free');
  });

  it('records an api_subscription_created revenue event', async () => {
    const buyer = await makeUser({ stripeCustomerId: 'cus_api3' });
    await makeApiKey(buyer._id);
    const event = checkoutCompleted(
      { userId: String(buyer._id), apiTier: 'Pro', isApiSubscription: 'true' },
      { amount_total: 4900 },
      'evt_api_3',
    );

    await POST(webhookRequest(event));

    const revenue = await RevenueEvent.findOne({ stripeEventId: 'evt_api_3' });
    expect(revenue!.eventType).toBe('api_subscription_created');
    expect(revenue!.newTier).toBe('Pro');
    expect(revenue!.amountCents).toBe(4900);
  });

  it('ignores an API checkout with no apiTier', async () => {
    const buyer = await makeUser({ stripeCustomerId: 'cus_api4' });
    const key = await makeApiKey(buyer._id);
    const event = checkoutCompleted(
      { userId: String(buyer._id), isApiSubscription: 'true' },
      {},
      'evt_api_4',
    );

    const res = await POST(webhookRequest(event));

    expect(res.status).toBe(200);
    expect((await ApiKey.findById(key._id))!.apiTier).toBe('Free');
    expect(await RevenueEvent.countDocuments({})).toBe(0);
  });
});
