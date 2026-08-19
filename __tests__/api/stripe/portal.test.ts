/**
 * @jest-environment node
 *
 * GET /api/stripe/portal
 *
 * The billing portal lets someone cancel, change card, and read invoices, so the
 * only thing that must never happen is opening it against a customer id the
 * caller does not own. The Stripe SDK is a local double; nothing leaves the
 * machine and no real key is used.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));

let mockSession: { user?: { id?: string; role?: string } } | null = null;
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () => mockSession),
}));

jest.mock('stripe', () => {
  const portalCreate = jest.fn(async () => ({
    id: 'bps_test_1',
    url: 'https://billing.stripe.com/p/session/bps_test_1',
  }));
  class MockStripe {
    billingPortal = { sessions: { create: portalCreate } };
    static __mocks = { portalCreate };
  }
  return { __esModule: true, default: MockStripe };
});

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { User } from '@/models/User';

const { portalCreate } = (Stripe as unknown as { __mocks: { portalCreate: jest.Mock } }).__mocks;

function lastPortalArgs(): { customer: string; return_url: string } {
  return portalCreate.mock.calls[portalCreate.mock.calls.length - 1][0] as {
    customer: string;
    return_url: string;
  };
}

let mongod: MongoMemoryServer;
let GET: typeof import('../../../app/api/stripe/portal/route').GET;

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_not_a_real_key';
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  ({ GET } = await import('../../../app/api/stripe/portal/route'));
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
    name: `Subscriber ${seq}`,
    email: `subscriber${seq}@example.com`,
    password: 'x',
    ...overrides,
  });
  mockSession = { user: { id: String(user._id), role: 'Student' } };
  return user;
}

function portalRequest(query = '', origin = 'https://flashlearnai.witus.online') {
  return new NextRequest(`https://flashlearnai.witus.online/api/stripe/portal${query}`, {
    method: 'GET',
    headers: new Headers({ origin }),
  });
}

async function readJson(res: Response) {
  return (await res.json()) as { error?: string; url?: string };
}

describe('GET /api/stripe/portal', () => {
  it('rejects an unauthenticated caller before touching Stripe', async () => {
    mockSession = null;

    const res = await GET(portalRequest());

    expect(res.status).toBe(401);
    expect((await readJson(res)).error).toBe('Unauthorized');
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it('returns 404 for a user who has never bought anything', async () => {
    await signInAsNewUser();

    const res = await GET(portalRequest());

    expect(res.status).toBe(404);
    expect((await readJson(res)).error).toMatch(/no billing account/i);
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it('returns 404 when the session points at a user row that is gone', async () => {
    mockSession = { user: { id: '64d0000000000000000000aa', role: 'Student' } };

    const res = await GET(portalRequest());

    expect(res.status).toBe(404);
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it("opens the portal for the caller's own customer id", async () => {
    await signInAsNewUser({ stripeCustomerId: 'cus_mine_1' });

    const res = await GET(portalRequest());

    expect(res.status).toBe(200);
    expect((await readJson(res)).url).toBe('https://billing.stripe.com/p/session/bps_test_1');
    expect(lastPortalArgs().customer).toBe('cus_mine_1');
  });

  it('ignores a customer id supplied in the query string', async () => {
    await signInAsNewUser({ stripeCustomerId: 'cus_mine_2' });
    await User.create({
      name: 'Someone Else',
      email: 'else@example.com',
      password: 'x',
      stripeCustomerId: 'cus_theirs',
    });

    await GET(portalRequest('?customer=cus_theirs&customerId=cus_theirs'));

    expect(lastPortalArgs().customer).toBe('cus_mine_2');
  });

  it('builds the return url from the request origin', async () => {
    await signInAsNewUser({ stripeCustomerId: 'cus_mine_3' });

    await GET(portalRequest('', 'https://flashlearn.example'));

    expect(lastPortalArgs().return_url).toBe('https://flashlearn.example/dashboard');
  });

  it('reports a Stripe failure as a 500', async () => {
    await signInAsNewUser({ stripeCustomerId: 'cus_mine_4' });
    portalCreate.mockRejectedValueOnce(new Error('stripe is down'));

    const res = await GET(portalRequest());

    expect(res.status).toBe(500);
    expect((await readJson(res)).error).toBe('Failed to create portal session');
  });
});
