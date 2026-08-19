/**
 * @jest-environment node
 *
 * Trigger 4f on POST /api/stripe/webhook: an account crossing from Free into a
 * paid tier drafts a welcome post. Stripe redelivers events and sends a
 * subscription.updated for plenty of things that are not a signup, so the cases
 * that carry the weight are the ones asserting silence: a redelivery, a
 * tier-to-tier move, a downgrade, and a subscription that is not yet active.
 *
 * Signatures come from the real Stripe SDK helper (pure HMAC, no network) and
 * fireSignupTrigger is mocked, so nothing here reaches Stripe or the Outbox.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
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
jest.mock('../../../lib/outbox-trigger', () => ({ fireSignupTrigger: jest.fn(async () => {}) }));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { User } from '@/models/User';
import { RevenueEvent } from '@/models/RevenueEvent';
import { fireSignupTrigger } from '@/lib/outbox-trigger';

const WEBHOOK_SECRET = 'whsec_flashlearn_outbox_test';
const ANNUAL_PRICE = 'price_annual_outbox';
const MONTHLY_PRICE = 'price_monthly_outbox';

const mockedSignup = fireSignupTrigger as jest.MockedFunction<typeof fireSignupTrigger>;

let mongod: MongoMemoryServer;
let POST: typeof import('../../../app/api/stripe/webhook/route').POST;

beforeAll(async () => {
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
  await Promise.all([User.deleteMany({}), RevenueEvent.deleteMany({})]);
});

let seq = 0;

async function makeUser(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return User.create({
    name: `Upgrader ${seq}`,
    email: `upgrader${seq}@example.com`,
    password: 'x',
    ...overrides,
  });
}

function subscriptionUpdated(
  customer: string,
  eventId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: eventId,
    object: 'event',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_outbox_1',
        object: 'subscription',
        customer,
        status: 'active',
        items: { data: [{ price: { id: MONTHLY_PRICE } }] },
        ...overrides,
      },
    },
  };
}

function webhookRequest(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  return new NextRequest('https://flashlearnai.witus.online/api/stripe/webhook', {
    method: 'POST',
    body: payload,
    headers: new Headers({
      'content-type': 'application/json',
      'stripe-signature': Stripe.webhooks.generateTestHeaderString({
        payload,
        secret: WEBHOOK_SECRET,
      }),
    }),
  });
}

describe('POST /api/stripe/webhook: a paid-tier signup drafts a post', () => {
  it('fires with the monthly tier when a Free account activates a monthly plan', async () => {
    const user = await makeUser({ stripeCustomerId: 'cus_up_monthly', username: 'nova' });

    await POST(webhookRequest(subscriptionUpdated('cus_up_monthly', 'evt_up_monthly')));

    expect(mockedSignup).toHaveBeenCalledTimes(1);
    expect(mockedSignup).toHaveBeenCalledWith({
      newUser: { id: String(user._id), handle: 'nova', email: user.email },
      tier: 'monthly',
    });
  });

  it('fires with the annual tier when the price id is the annual one', async () => {
    await makeUser({ stripeCustomerId: 'cus_up_annual' });

    await POST(
      webhookRequest(
        subscriptionUpdated('cus_up_annual', 'evt_up_annual', {
          items: { data: [{ price: { id: ANNUAL_PRICE } }] },
        }),
      ),
    );

    expect(mockedSignup).toHaveBeenCalledTimes(1);
    expect(mockedSignup.mock.calls[0][0].tier).toBe('annual');
  });

  it('passes a null handle when the account has no username to anonymize', async () => {
    await makeUser({ stripeCustomerId: 'cus_up_nohandle' });

    await POST(webhookRequest(subscriptionUpdated('cus_up_nohandle', 'evt_up_nohandle')));

    expect(mockedSignup.mock.calls[0][0].newUser.handle).toBeNull();
  });
});

describe('POST /api/stripe/webhook: everything that must NOT draft', () => {
  it('does not fire a second time when Stripe redelivers the same event id', async () => {
    await makeUser({ stripeCustomerId: 'cus_replay', username: 'twice' });
    const event = subscriptionUpdated('cus_replay', 'evt_replay_signup');

    await POST(webhookRequest(event));
    await POST(webhookRequest(event));

    expect(mockedSignup).toHaveBeenCalledTimes(1);
    expect(await RevenueEvent.countDocuments({})).toBe(1);
  });

  it('does not fire on a move between two paid tiers', async () => {
    await makeUser({ stripeCustomerId: 'cus_m2a', subscriptionTier: 'Monthly Pro' });

    await POST(
      webhookRequest(
        subscriptionUpdated('cus_m2a', 'evt_m2a', {
          items: { data: [{ price: { id: ANNUAL_PRICE } }] },
        }),
      ),
    );

    expect((await User.findOne({ stripeCustomerId: 'cus_m2a' }))!.subscriptionTier).toBe('Annual Pro');
    expect(mockedSignup).not.toHaveBeenCalled();
  });

  it('does not fire on a downgrade', async () => {
    await makeUser({ stripeCustomerId: 'cus_a2m', subscriptionTier: 'Annual Pro' });

    await POST(webhookRequest(subscriptionUpdated('cus_a2m', 'evt_a2m')));

    expect((await RevenueEvent.findOne({ stripeEventId: 'evt_a2m' }))!.eventType).toBe('downgraded');
    expect(mockedSignup).not.toHaveBeenCalled();
  });

  it('does not fire when the tier does not move', async () => {
    await makeUser({ stripeCustomerId: 'cus_same_tier', subscriptionTier: 'Monthly Pro' });

    await POST(webhookRequest(subscriptionUpdated('cus_same_tier', 'evt_same_tier')));

    expect(mockedSignup).not.toHaveBeenCalled();
  });

  it('does not fire while the subscription is still past_due', async () => {
    await makeUser({ stripeCustomerId: 'cus_pastdue_signup' });

    await POST(
      webhookRequest(
        subscriptionUpdated('cus_pastdue_signup', 'evt_pastdue_signup', { status: 'past_due' }),
      ),
    );

    expect((await User.findOne({ stripeCustomerId: 'cus_pastdue_signup' }))!.subscriptionTier).toBe('Free');
    expect(mockedSignup).not.toHaveBeenCalled();
  });

  it('does not fire for a customer with no matching account', async () => {
    await POST(webhookRequest(subscriptionUpdated('cus_stranger', 'evt_stranger')));

    expect(mockedSignup).not.toHaveBeenCalled();
  });

  it('does not fire on a cancellation', async () => {
    await makeUser({ stripeCustomerId: 'cus_cancel_signup', subscriptionTier: 'Monthly Pro' });
    const event = {
      id: 'evt_cancel_signup',
      object: 'event',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_outbox_2',
          object: 'subscription',
          customer: 'cus_cancel_signup',
          status: 'canceled',
          items: { data: [{ price: { id: MONTHLY_PRICE } }] },
        },
      },
    };

    await POST(webhookRequest(event));

    expect((await User.findOne({ stripeCustomerId: 'cus_cancel_signup' }))!.subscriptionTier).toBe('Free');
    expect(mockedSignup).not.toHaveBeenCalled();
  });

  it('does not fire when the signature does not verify', async () => {
    await makeUser({ stripeCustomerId: 'cus_forged' });
    const event = subscriptionUpdated('cus_forged', 'evt_forged');
    const payload = JSON.stringify(event);
    const request = new NextRequest('https://flashlearnai.witus.online/api/stripe/webhook', {
      method: 'POST',
      body: payload,
      headers: new Headers({
        'content-type': 'application/json',
        'stripe-signature': 't=1700000000,v1=deadbeefdeadbeefdeadbeefdeadbeef',
      }),
    });

    const res = await POST(request);

    expect(res.status).toBe(400);
    expect(mockedSignup).not.toHaveBeenCalled();
  });
});
