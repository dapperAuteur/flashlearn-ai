/**
 * @jest-environment node
 *
 * POST /api/stripe/checkout
 *
 * The question this suite exists to answer: can a caller influence what they are
 * charged, or what they receive, by what they put in the request body? The Stripe
 * SDK is replaced with a local double, so the arguments the route hands Stripe are
 * inspectable and nothing leaves the machine. No real key is used.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));

let mockSession: { user?: { id?: string; role?: string } } | null = null;
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () => mockSession),
}));

jest.mock('stripe', () => {
  const customersCreate = jest.fn(async () => ({ id: 'cus_created_by_route' }));
  const sessionsCreate = jest.fn(async () => ({
    id: 'cs_test_1',
    url: 'https://checkout.stripe.com/c/pay/cs_test_1',
  }));
  class MockStripe {
    customers = { create: customersCreate };
    checkout = { sessions: { create: sessionsCreate } };
    static __mocks = { customersCreate, sessionsCreate };
  }
  return { __esModule: true, default: MockStripe };
});

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { User } from '@/models/User';

const MONTHLY_PRICE = 'price_monthly_test';
const LIFETIME_PRICE = 'price_lifetime_test';
/** The literal the route treats as "an operator never filled this in". */
const PLACEHOLDER_PRICE = 'price_...';

interface CheckoutMocks {
  customersCreate: jest.Mock;
  sessionsCreate: jest.Mock;
}
const { customersCreate, sessionsCreate } = (Stripe as unknown as { __mocks: CheckoutMocks }).__mocks;

interface CheckoutArgs {
  customer: string;
  mode: string;
  line_items: Array<{ price: unknown; quantity: number }>;
  success_url: string;
  cancel_url: string;
  metadata: Record<string, string>;
}
function lastCheckoutArgs(): CheckoutArgs {
  return sessionsCreate.mock.calls[sessionsCreate.mock.calls.length - 1][0] as CheckoutArgs;
}

let mongod: MongoMemoryServer;
let POST: typeof import('../../../app/api/stripe/checkout/route').POST;

beforeAll(async () => {
  // PRICE_MAP is built at module load, so the env has to be set before the import.
  process.env.STRIPE_SECRET_KEY = 'sk_test_not_a_real_key';
  process.env.NEXT_PUBLIC_STRIPE_10_MONTHLY_PRICE = MONTHLY_PRICE;
  process.env.NEXT_PUBLIC_STRIPE_100_LIFETIME_PRICE = LIFETIME_PRICE;
  // Left at the placeholder on purpose so the "price not configured" branch is reachable.
  process.env.NEXT_PUBLIC_STRIPE_100_ANNUAL_PRICE = PLACEHOLDER_PRICE;

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  ({ POST } = await import('../../../app/api/stripe/checkout/route'));
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  mockSession = null;
  await User.deleteMany({});
});

let seq = 0;

async function signInAsNewUser(overrides: Record<string, unknown> = {}) {
  seq += 1;
  const user = await User.create({
    name: `Shopper ${seq}`,
    email: `shopper${seq}@example.com`,
    password: 'x',
    ...overrides,
  });
  mockSession = { user: { id: String(user._id), role: 'Student' } };
  return user;
}

function checkoutRequest(body: unknown, origin = 'https://flashlearnai.witus.online') {
  return new NextRequest('https://flashlearnai.witus.online/api/stripe/checkout', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: new Headers({ 'content-type': 'application/json', origin }),
  });
}

async function readJson(res: Response) {
  return (await res.json()) as { error?: string; url?: string };
}

describe('POST /api/stripe/checkout: access', () => {
  it('rejects an unauthenticated caller before touching Stripe', async () => {
    mockSession = null;

    const res = await POST(checkoutRequest({ plan: 'monthly' }));

    expect(res.status).toBe(401);
    expect((await readJson(res)).error).toBe('Unauthorized');
    expect(customersCreate).not.toHaveBeenCalled();
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('rejects a session with no user id', async () => {
    mockSession = { user: {} };

    const res = await POST(checkoutRequest({ plan: 'monthly' }));

    expect(res.status).toBe(401);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('returns 404 when the session points at a user row that is gone', async () => {
    mockSession = { user: { id: '64d000000000000000000099', role: 'Student' } };

    const res = await POST(checkoutRequest({ plan: 'monthly' }));

    expect(res.status).toBe(404);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('refuses a second subscription for someone already on a paid tier', async () => {
    await signInAsNewUser({ subscriptionTier: 'Annual Pro' });

    const res = await POST(checkoutRequest({ plan: 'monthly' }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/already have an active subscription/i);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/stripe/checkout: plan validation', () => {
  it('rejects a missing plan', async () => {
    await signInAsNewUser();

    const res = await POST(checkoutRequest({}));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('Invalid plan');
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('rejects a plan name that is not on the price map', async () => {
    await signInAsNewUser();

    const res = await POST(checkoutRequest({ plan: 'enterprise' }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('Invalid plan');
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('refuses to open checkout when the price id is still the placeholder', async () => {
    await signInAsNewUser();

    const res = await POST(checkoutRequest({ plan: 'annual' }));

    expect(res.status).toBe(500);
    expect((await readJson(res)).error).toMatch(/price not configured/i);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  /**
   * FINDING, not a fix. app/api/stripe/checkout/route.ts:33 guards with
   * `!PRICE_MAP[plan]`, a bare index into an object literal, so any key inherited
   * from Object.prototype ("constructor", "toString", "valueOf", ...) reads as a
   * truthy price and walks straight past the guard. The line-items price then
   * holds a function rather than a price id, so Stripe rejects the session and
   * the caller gets a 500 instead of the 400 they should get. The cost is that an
   * unauthenticated-to-Stripe garbage plan still creates a real Stripe customer
   * first (route line 63). An allowlist check such as
   * Object.hasOwn(PRICE_MAP, plan) would close it. Current behaviour asserted.
   */
  it('does not reject a plan name inherited from Object.prototype', async () => {
    await signInAsNewUser();

    const res = await POST(checkoutRequest({ plan: 'constructor' }));

    expect(res.status).not.toBe(400);
    expect(customersCreate).toHaveBeenCalled();
    expect(typeof lastCheckoutArgs().line_items[0].price).not.toBe('string');
  });

  /**
   * FINDING, not a fix. A body that is not JSON throws inside the try block at
   * app/api/stripe/checkout/route.ts:31 and lands in the generic catch, so the
   * caller sees a 500 for what is a client error. Harmless for money, since
   * nothing reaches Stripe, but it makes a bad request look like an outage.
   */
  it('answers a malformed body with 500 rather than 400', async () => {
    await signInAsNewUser();

    const res = await POST(checkoutRequest('not json at all'));

    expect(res.status).toBe(500);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/stripe/checkout: what the caller can influence', () => {
  it('prices a monthly plan from the server price map', async () => {
    const user = await signInAsNewUser();

    const res = await POST(checkoutRequest({ plan: 'monthly' }));

    expect(res.status).toBe(200);
    expect((await readJson(res)).url).toBe('https://checkout.stripe.com/c/pay/cs_test_1');
    const args = lastCheckoutArgs();
    expect(args.line_items).toEqual([{ price: MONTHLY_PRICE, quantity: 1 }]);
    expect(args.mode).toBe('subscription');
    expect(args.metadata.tier).toBe('Monthly Pro');
    expect(args.metadata.userId).toBe(String(user._id));
  });

  it('ignores a price, tier, or amount supplied in the request body', async () => {
    await signInAsNewUser();

    const res = await POST(
      checkoutRequest({
        plan: 'monthly',
        priceId: 'price_one_cent',
        price: 'price_one_cent',
        tier: 'Lifetime Learner',
        amount: 1,
        amount_total: 1,
        mode: 'payment',
      }),
    );

    expect(res.status).toBe(200);
    const args = lastCheckoutArgs();
    // Paying the monthly price must never carry the lifetime entitlement.
    expect(args.line_items[0].price).toBe(MONTHLY_PRICE);
    expect(args.metadata.tier).toBe('Monthly Pro');
    expect(args.mode).toBe('subscription');
  });

  it('cannot be pointed at another user by a userId in the body', async () => {
    const user = await signInAsNewUser();
    const victim = await User.create({ name: 'Victim', email: 'victim@example.com', password: 'x' });

    await POST(checkoutRequest({ plan: 'monthly', userId: String(victim._id) }));

    expect(lastCheckoutArgs().metadata.userId).toBe(String(user._id));
  });

  it('bills a lifetime plan as a one-off payment', async () => {
    await signInAsNewUser();

    const res = await POST(checkoutRequest({ plan: 'lifetime' }));

    expect(res.status).toBe(200);
    const args = lastCheckoutArgs();
    expect(args.line_items[0].price).toBe(LIFETIME_PRICE);
    expect(args.mode).toBe('payment');
    expect(args.metadata.tier).toBe('Lifetime Learner');
  });
});

describe('POST /api/stripe/checkout: customer handling', () => {
  it('creates a Stripe customer once and stores the id on the user', async () => {
    const user = await signInAsNewUser();

    await POST(checkoutRequest({ plan: 'monthly' }));

    expect(customersCreate).toHaveBeenCalledTimes(1);
    expect(customersCreate.mock.calls[0][0]).toMatchObject({
      email: user.email,
      metadata: { userId: String(user._id) },
    });
    expect((await User.findById(user._id))!.stripeCustomerId).toBe('cus_created_by_route');
    expect(lastCheckoutArgs().customer).toBe('cus_created_by_route');
  });

  it('reuses an existing customer id instead of making a duplicate', async () => {
    await signInAsNewUser({ stripeCustomerId: 'cus_already_mine' });

    await POST(checkoutRequest({ plan: 'monthly' }));

    expect(customersCreate).not.toHaveBeenCalled();
    expect(lastCheckoutArgs().customer).toBe('cus_already_mine');
  });

  it('builds the return urls from the request origin', async () => {
    await signInAsNewUser();

    await POST(checkoutRequest({ plan: 'monthly' }, 'https://flashlearn.example'));

    const args = lastCheckoutArgs();
    expect(args.success_url).toBe('https://flashlearn.example/pricing?success=true&plan=monthly');
    expect(args.cancel_url).toBe('https://flashlearn.example/pricing?canceled=true');
  });

  it('reports a Stripe failure as a 500 without changing the user', async () => {
    const user = await signInAsNewUser({ stripeCustomerId: 'cus_already_mine' });
    sessionsCreate.mockRejectedValueOnce(new Error('stripe is down'));

    const res = await POST(checkoutRequest({ plan: 'monthly' }));

    expect(res.status).toBe(500);
    expect((await readJson(res)).error).toBe('Failed to create checkout session');
    expect((await User.findById(user._id))!.subscriptionTier).toBe('Free');
  });
});
