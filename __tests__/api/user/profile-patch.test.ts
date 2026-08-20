/**
 * @jest-environment node
 *
 * PATCH /api/user/profile is the one route that writes a flag onto the signed-in
 * user's own record, which is exactly why it is worth pinning down. It takes a
 * short allowlist of booleans and copies nothing else out of the body.
 *
 * The test that matters most is the last one. If someone ever refactors this
 * handler into a "spread the body" update, `role` and `subscriptionTier` become
 * self-service and this suite has to be the thing that stops it.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    debug: jest.fn(async () => null),
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { USER: 'user' },
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { User } from '@/models/User';
import { PATCH } from '@/app/api/user/profile/route';

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  await User.deleteMany({});
});

async function seedUser() {
  const user = await User.create({
    name: 'Rosalind Achebe',
    email: `learner-${new mongoose.Types.ObjectId().toString()}@example.com`,
    role: 'Student',
    subscriptionTier: 'Free',
  });
  mockedSession.mockResolvedValue({ user: { id: user._id.toString() } } as never);
  return user;
}

/** Only the fields these assertions read. `lean()` is otherwise untyped here. */
type StoredUser = {
  role?: string;
  subscriptionTier?: string;
  onboardingCompleted?: boolean;
  shareToOutboxOptIn?: boolean;
};

function readUser(id: mongoose.Types.ObjectId) {
  return User.findById(id).lean<StoredUser | null>();
}

function patchRequest(body: unknown) {
  return new NextRequest('https://flashlearnai.witus.online/api/user/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/user/profile', () => {
  it('refuses a caller without a session', async () => {
    mockedSession.mockResolvedValue(null as never);
    const res = await PATCH(patchRequest({ onboardingCompleted: true }));
    expect(res.status).toBe(401);
  });

  it('sets onboardingCompleted', async () => {
    const user = await seedUser();

    const res = await PATCH(patchRequest({ onboardingCompleted: true }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user.onboardingCompleted).toBe(true);

    const stored = await readUser(user._id);
    expect(stored?.onboardingCompleted).toBe(true);
  });

  it('sets shareToOutboxOptIn, and can set it back off', async () => {
    const user = await seedUser();

    const onRes = await PATCH(patchRequest({ shareToOutboxOptIn: true }));
    expect(onRes.status).toBe(200);
    expect((await onRes.json()).user.shareToOutboxOptIn).toBe(true);

    const offRes = await PATCH(patchRequest({ shareToOutboxOptIn: false }));
    expect(offRes.status).toBe(200);
    expect((await offRes.json()).user.shareToOutboxOptIn).toBe(false);

    const stored = await readUser(user._id);
    expect(stored?.shareToOutboxOptIn).toBe(false);
  });

  it('sets both keys in one request', async () => {
    const user = await seedUser();

    const res = await PATCH(
      patchRequest({ onboardingCompleted: true, shareToOutboxOptIn: true }),
    );
    expect(res.status).toBe(200);

    const stored = await readUser(user._id);
    expect(stored?.onboardingCompleted).toBe(true);
    expect(stored?.shareToOutboxOptIn).toBe(true);
  });

  it('rejects a non-boolean value', async () => {
    const user = await seedUser();

    for (const value of ['true', 1, null, {}]) {
      const res = await PATCH(patchRequest({ shareToOutboxOptIn: value }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/shareToOutboxOptIn must be true or false/);
    }

    const stored = await readUser(user._id);
    expect(stored?.shareToOutboxOptIn).toBe(false);
  });

  it('rejects a body with no allowlisted key', async () => {
    await seedUser();
    const res = await PATCH(patchRequest({ name: 'Somebody Else' }));
    expect(res.status).toBe(400);
  });

  // The privilege-escalation guard. Sending role or subscriptionTier must not
  // move them, whether or not the request also carries a key the route accepts.
  it('cannot set role or subscriptionTier through it', async () => {
    const user = await seedUser();

    const aloneRes = await PATCH(
      patchRequest({ role: 'Admin', subscriptionTier: 'Lifetime Learner' }),
    );
    expect(aloneRes.status).toBe(400);

    const smuggledRes = await PATCH(
      patchRequest({
        onboardingCompleted: true,
        role: 'Admin',
        subscriptionTier: 'Lifetime Learner',
      }),
    );
    expect(smuggledRes.status).toBe(200);

    const responseUser = (await smuggledRes.json()).user;
    expect(responseUser.role).toBe('Student');
    expect(responseUser.subscriptionTier).toBe('Free');

    const stored = await readUser(user._id);
    expect(stored?.role).toBe('Student');
    expect(stored?.subscriptionTier).toBe('Free');
    expect(stored?.onboardingCompleted).toBe(true);
  });
});
