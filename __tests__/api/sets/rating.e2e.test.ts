/**
 * @jest-environment node
 *
 * Set ratings: one document per (set, user), a denormalized average on the set,
 * and the same visibility rule the set GET uses. The cases that matter are the
 * ones an embedded array would get wrong: re-rating updates instead of piling
 * up, clearing recomputes, and a private set nobody owns is unrateable.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
// The real module throws at import time without Upstash credentials. The route
// already treats a limiter failure as "proceed", so a permissive stub keeps the
// test on the behaviour it is checking.
jest.mock('../../../lib/ratelimit/ratelimit', () => ({
  getRateLimiter: () => ({ limit: async () => ({ success: true }) }),
}));

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { SetRating } from '@/models/SetRating';
import {
  GET as getRating,
  POST as postRating,
  DELETE as deleteRating,
} from '@/app/api/sets/[id]/rating/route';

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

const AUTHOR_ID = '64e000000000000000000001';
const RATER_ONE_ID = '64e000000000000000000002';
const RATER_TWO_ID = '64e000000000000000000003';
const RATER_THREE_ID = '64e000000000000000000004';

let mongod: MongoMemoryServer;
let authorProfileId: Types.ObjectId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // The unique (setId, user) index is what makes re-rating an update. Building it
  // explicitly means the test asserts against the real constraint.
  await SetRating.syncIndexes();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  const profile = await Profile.create({
    user: new Types.ObjectId(AUTHOR_ID),
    profileName: 'Set Author',
  });
  authorProfileId = profile._id as Types.ObjectId;
});

afterEach(async () => {
  jest.clearAllMocks();
  await Promise.all([
    FlashcardSet.deleteMany({}),
    Profile.deleteMany({}),
    SetRating.deleteMany({}),
  ]);
});

function signIn(userId: string) {
  mockedSession.mockResolvedValue({
    user: { id: userId, role: 'Student', email: 'rater@example.test' },
  } as never);
}

function signOut() {
  mockedSession.mockResolvedValue(null as never);
}

function request(setId: string, method: string, body?: unknown) {
  return new NextRequest(`https://flashlearnai.witus.online/api/sets/${setId}/rating`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function routeParams(setId: string) {
  return { params: Promise.resolve({ id: setId }) };
}

async function seedSet(isPublic: boolean) {
  const set = await FlashcardSet.create({
    profile: authorProfileId,
    title: 'Single Digit Addition',
    isPublic,
    source: 'CSV',
    cardCount: 1,
    flashcards: [{ front: '2 + 2', back: '4' }],
  });
  return String(set._id);
}

async function rate(setId: string, userId: string, rating: number) {
  signIn(userId);
  return postRating(request(setId, 'POST', { rating }), routeParams(setId));
}

it('creates a first rating and returns the new aggregate', async () => {
  const setId = await seedSet(true);

  const res = await rate(setId, RATER_ONE_ID, 4);

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ rating: 4, ratingAverage: 4, ratingCount: 1 });
  expect(await SetRating.countDocuments({ setId })).toBe(1);

  const set = await FlashcardSet.findById(setId).lean<{ ratingAverage: number; ratingCount: number }>();
  expect(set?.ratingAverage).toBe(4);
  expect(set?.ratingCount).toBe(1);
});

it('updates the existing rating instead of adding a second one', async () => {
  const setId = await seedSet(true);

  await rate(setId, RATER_ONE_ID, 2);
  const res = await rate(setId, RATER_ONE_ID, 5);

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ rating: 5, ratingAverage: 5, ratingCount: 1 });
  expect(await SetRating.countDocuments({ setId, user: new Types.ObjectId(RATER_ONE_ID) })).toBe(1);
});

it('averages across several raters', async () => {
  const setId = await seedSet(true);

  await rate(setId, RATER_ONE_ID, 5);
  await rate(setId, RATER_TWO_ID, 4);
  const res = await rate(setId, RATER_THREE_ID, 3);

  expect(await res.json()).toEqual({ rating: 3, ratingAverage: 4, ratingCount: 3 });

  const set = await FlashcardSet.findById(setId).lean<{ ratingAverage: number; ratingCount: number }>();
  expect(set?.ratingAverage).toBe(4);
  expect(set?.ratingCount).toBe(3);
});

it('recomputes the aggregate when a rating is cleared', async () => {
  const setId = await seedSet(true);

  await rate(setId, RATER_ONE_ID, 5);
  await rate(setId, RATER_TWO_ID, 1);

  signIn(RATER_TWO_ID);
  const res = await deleteRating(request(setId, 'DELETE'), routeParams(setId));

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ rating: null, ratingAverage: 5, ratingCount: 1 });
  expect(await SetRating.countDocuments({ setId })).toBe(1);

  const set = await FlashcardSet.findById(setId).lean<{ ratingAverage: number; ratingCount: number }>();
  expect(set?.ratingAverage).toBe(5);
  expect(set?.ratingCount).toBe(1);
});

it('drops the aggregate back to zero when the last rating is cleared', async () => {
  const setId = await seedSet(true);

  await rate(setId, RATER_ONE_ID, 3);

  signIn(RATER_ONE_ID);
  const res = await deleteRating(request(setId, 'DELETE'), routeParams(setId));

  expect(await res.json()).toEqual({ rating: null, ratingAverage: 0, ratingCount: 0 });
});

it('refuses to rate a private set the caller does not own, without confirming it exists', async () => {
  const setId = await seedSet(false);

  const res = await rate(setId, RATER_ONE_ID, 5);

  expect(res.status).toBe(404);
  expect((await res.json()).error).toBe('Set not found');
  expect(await SetRating.countDocuments({})).toBe(0);
});

it('refuses to rate your own set', async () => {
  const setId = await seedSet(true);

  const res = await rate(setId, AUTHOR_ID, 5);

  expect(res.status).toBe(403);
  expect((await res.json()).error).toBe('You cannot rate your own set');
  expect(await SetRating.countDocuments({})).toBe(0);
});

it('rejects an unauthenticated rating', async () => {
  const setId = await seedSet(true);
  signOut();

  const post = await postRating(request(setId, 'POST', { rating: 5 }), routeParams(setId));
  const del = await deleteRating(request(setId, 'DELETE'), routeParams(setId));

  expect(post.status).toBe(401);
  expect(del.status).toBe(401);
  expect(await SetRating.countDocuments({})).toBe(0);
});

it('rejects ratings outside 1 to 5 and non-integers', async () => {
  const setId = await seedSet(true);
  signIn(RATER_ONE_ID);

  for (const rating of [0, 6, 4.5, '5', null]) {
    const res = await postRating(request(setId, 'POST', { rating }), routeParams(setId));
    expect(res.status).toBe(400);
  }

  expect(await SetRating.countDocuments({})).toBe(0);
});

it('reports the caller their own rating and whether they may rate', async () => {
  const setId = await seedSet(true);
  await rate(setId, RATER_ONE_ID, 4);

  signIn(RATER_ONE_ID);
  const mine = await getRating(request(setId, 'GET'), routeParams(setId));
  expect(await mine.json()).toEqual({
    rating: 4,
    canRate: true,
    ratingAverage: 4,
    ratingCount: 1,
  });

  signIn(AUTHOR_ID);
  const authors = await getRating(request(setId, 'GET'), routeParams(setId));
  expect(await authors.json()).toEqual({
    rating: null,
    canRate: false,
    ratingAverage: 4,
    ratingCount: 1,
  });

  signOut();
  const anonymous = await getRating(request(setId, 'GET'), routeParams(setId));
  expect(anonymous.status).toBe(200);
  expect(await anonymous.json()).toEqual({
    rating: null,
    canRate: false,
    ratingAverage: 4,
    ratingCount: 1,
  });
});

it('sorts Explore by rating when asked', async () => {
  const { GET: getPublicSets } = await import('@/app/api/sets/public/route');

  const wellRated = await seedSet(true);
  const poorlyRated = await seedSet(true);

  await rate(wellRated, RATER_ONE_ID, 5);
  await rate(wellRated, RATER_TWO_ID, 5);
  await rate(poorlyRated, RATER_ONE_ID, 2);

  const res = await getPublicSets(
    new NextRequest('https://flashlearnai.witus.online/api/sets/public?sort=rating'),
  );
  const body = await res.json();

  expect(body.sets.map((s: { id: string }) => s.id)).toEqual([wellRated, poorlyRated]);
  expect(body.sets[0]).toMatchObject({ ratingAverage: 5, ratingCount: 2 });
});
