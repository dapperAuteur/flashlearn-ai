/**
 * @jest-environment node
 *
 * Trigger 4e on PATCH /api/sets/[id]: a set that flips private -> public drafts
 * one social post. The half that matters is the negative one. `isPublic` is not
 * the condition, the transition is, so an edit to a set that was already public
 * has to draft nothing at all or every title tweak posts again.
 *
 * fireOutboxDrafts is mocked, so nothing here reaches the Outbox.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
// The real module throws at import time without Upstash credentials, and the
// route treats a limiter failure as "proceed" anyway.
jest.mock('../../../lib/ratelimit/ratelimit', () => ({
  getRateLimiter: () => ({ limit: async () => ({ success: true }) }),
}));
// Switchy is a live HTTP call on the same "became public" branch. Stubbing it
// keeps the suite offline and keeps its failures out of these assertions.
jest.mock('../../../lib/switchy', () => ({
  createShortLink: jest.fn(async () => null),
  toSwitchySlug: (prefix: string, title: string) => `${prefix}-${title}`,
}));
jest.mock('../../../lib/outbox-trigger', () => ({ fireOutboxDrafts: jest.fn() }));
// The real Logger writes to Mongo through its own connection and floods the
// output when that fails. Nothing here asserts on log lines.
jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    debug: jest.fn(async () => null),
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { FLASHCARD: 'flashcard' },
}));

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { fireOutboxDrafts } from '@/lib/outbox-trigger';
import { PATCH } from '@/app/api/sets/[id]/route';

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedFire = fireOutboxDrafts as jest.MockedFunction<typeof fireOutboxDrafts>;

const ADMIN_ID = '64f000000000000000000001';
const OWNER_ID = '64f000000000000000000002';

let mongod: MongoMemoryServer;
let ownerProfileId: Types.ObjectId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const profile = await Profile.create({
    user: new Types.ObjectId(OWNER_ID),
    profileName: 'Owner Profile',
  });
  ownerProfileId = profile._id;
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  await FlashcardSet.deleteMany({});
});

function signIn(userId: string, role: string) {
  mockedSession.mockResolvedValue({ user: { id: userId, role } } as never);
}

async function seedSet(isPublic: boolean, overrides: Record<string, unknown> = {}) {
  return FlashcardSet.create({
    profile: ownerProfileId,
    title: 'Krebs Cycle',
    source: 'CSV',
    isPublic,
    cardCount: 3,
    flashcards: [
      { front: 'Q1', back: 'A1' },
      { front: 'Q2', back: 'A2' },
      { front: 'Q3', back: 'A3' },
    ],
    ...overrides,
  });
}

function patch(setId: string, body: unknown) {
  const request = new NextRequest(`https://flashlearnai.witus.online/api/sets/${setId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id: setId }) });
}

describe('PATCH /api/sets/[id]: the private -> public flip drafts a post', () => {
  it('fires once when an admin flips a private set public', async () => {
    signIn(ADMIN_ID, 'Admin');
    const set = await seedSet(false);

    const res = await patch(String(set._id), { title: 'Krebs Cycle', isPublic: true });

    expect(res.status).toBe(200);
    expect((await FlashcardSet.findById(set._id))!.isPublic).toBe(true);
    expect(mockedFire).toHaveBeenCalledTimes(1);
    const arg = mockedFire.mock.calls[0][0];
    expect(arg.triggerUserId).toBe(ADMIN_ID);
    expect(arg.externalRefBase).toBe(`public-set-${String(set._id)}`);
    expect(arg.caption).toContain('Krebs Cycle');
    expect(arg.caption).toContain('3 cards');
  });

  it('uses the same external_ref the create-as-public trigger uses', async () => {
    signIn(ADMIN_ID, 'Admin');
    const set = await seedSet(false);

    await patch(String(set._id), { isPublic: true });

    // POST /api/flashcards builds `public-set-${savedSet._id}`. Matching it is
    // what stops a set drafting twice for one milestone.
    expect(mockedFire.mock.calls[0][0].externalRefBase).toBe(`public-set-${String(set._id)}`);
  });
});

describe('PATCH /api/sets/[id]: everything that must NOT draft', () => {
  it('does not fire when a PATCH leaves an already-public set public', async () => {
    signIn(ADMIN_ID, 'Admin');
    const set = await seedSet(true);

    const res = await patch(String(set._id), { title: 'Krebs Cycle, revised', isPublic: true });

    expect(res.status).toBe(200);
    expect((await FlashcardSet.findById(set._id))!.title).toBe('Krebs Cycle, revised');
    expect(mockedFire).not.toHaveBeenCalled();
  });

  it('does not fire twice when the same flip is PATCHed again', async () => {
    signIn(ADMIN_ID, 'Admin');
    const set = await seedSet(false);

    await patch(String(set._id), { isPublic: true });
    await patch(String(set._id), { isPublic: true });

    expect(mockedFire).toHaveBeenCalledTimes(1);
  });

  it('does not fire when a set is flipped public -> private', async () => {
    signIn(ADMIN_ID, 'Admin');
    const set = await seedSet(true);

    await patch(String(set._id), { isPublic: false });

    expect((await FlashcardSet.findById(set._id))!.isPublic).toBe(false);
    expect(mockedFire).not.toHaveBeenCalled();
  });

  it('does not fire on a non-admin edit, which cannot change isPublic at all', async () => {
    signIn(OWNER_ID, 'Student');
    const set = await seedSet(false);

    const res = await patch(String(set._id), { title: 'Renamed', isPublic: true });

    expect(res.status).toBe(200);
    // The route ignores isPublic for non-admins, so no transition happened.
    expect((await FlashcardSet.findById(set._id))!.isPublic).toBe(false);
    expect(mockedFire).not.toHaveBeenCalled();
  });

  it('does not fire when the update matches no set', async () => {
    signIn(OWNER_ID, 'Student');
    const missing = new Types.ObjectId();

    const res = await patch(String(missing), { title: 'Ghost', isPublic: true });

    expect(res.status).toBe(404);
    expect(mockedFire).not.toHaveBeenCalled();
  });

  it('does not fire when the request is rejected as unauthorized', async () => {
    mockedSession.mockResolvedValue(null as never);
    const set = await seedSet(false);

    const res = await patch(String(set._id), { isPublic: true });

    expect(res.status).toBe(401);
    expect(mockedFire).not.toHaveBeenCalled();
  });

  it('does not fire when a non-admin is refused an edit to a public set', async () => {
    signIn(OWNER_ID, 'Student');
    const set = await seedSet(true);

    const res = await patch(String(set._id), { title: 'Sneaky' });

    expect(res.status).toBe(403);
    expect(mockedFire).not.toHaveBeenCalled();
  });
});
