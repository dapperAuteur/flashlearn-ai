/**
 * @jest-environment node
 *
 * A set you create is on your own shelf from the moment it exists.
 *
 * Without this, the dashboard leads with a library that does not contain the
 * set the person just made, which reads as the save having failed. Both create
 * paths are covered: the in-app save and the public API.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/switchy', () => ({
  createShortLink: jest.fn(async () => null),
  toSwitchySlug: (prefix: string, value: string) => `${prefix}-${value}`,
}));
jest.mock('../../../lib/outbox-trigger', () => ({ fireOutboxDrafts: jest.fn() }));
jest.mock('../../../lib/services/activityService', () => ({
  createActivityEvent: jest.fn(async () => null),
}));
jest.mock('../../../lib/logging/flashcard-logger', () => ({
  apiLogger: { info: jest.fn(), warning: jest.fn(), error: jest.fn() },
  analytics: { trackSetSaved: jest.fn(async () => null) },
}));

let currentUserId: string | null = null;
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(async () => (currentUserId ? { user: { id: currentUserId } } : null)),
}));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));

const API_USER_ID = '64b000000000000000000abc';

jest.mock('../../../lib/api/withApiAuth', () => {
  const { apiSuccess, apiError, generateRequestId } = jest.requireActual('../../../lib/api/apiResponse');
  const { Types } = jest.requireActual('mongoose');
  return {
    apiSuccess,
    apiError,
    generateRequestId,
    withApiAuth: (handler: (...args: unknown[]) => Promise<unknown>) => async (req: unknown) =>
      handler(
        req,
        {
          user: { _id: new Types.ObjectId(API_USER_ID) },
          apiKey: { _id: new Types.ObjectId('64a000000000000000000abc'), permissions: ['*'] },
          keyType: 'ecosystem',
          apiTier: 'Free',
        },
        'req-test',
      ),
  };
});

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { FlashcardSet } from '@/models/FlashcardSet';
import { LibraryEntry } from '@/models/LibraryEntry';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';

import { POST as saveSet } from '@/app/api/flashcards/route';
import { POST as createApiSet } from '@/app/api/v1/sets/route';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  // The in-app save route opens its own connection from this variable.
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(mongod.getUri());
  await LibraryEntry.syncIndexes();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  currentUserId = null;
  await Promise.all([
    User.deleteMany({}),
    Profile.deleteMany({}),
    FlashcardSet.deleteMany({}),
    LibraryEntry.deleteMany({}),
  ]);
});

it('puts an in-app saved set on the author shelf', async () => {
  const user = await User.create({
    name: 'Author',
    email: 'author@example.com',
    password: 'x',
    role: 'Student',
  });
  const profile = await Profile.create({ user: user._id, profileName: 'My Profile' });
  await User.findByIdAndUpdate(user._id, { $push: { profiles: profile._id } });
  currentUserId = String(user._id);

  const res = await saveSet(
    new NextRequest('http://localhost/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'My own deck',
        isPublic: false,
        flashcards: [{ front: 'q', back: 'a' }],
      }),
    }),
  );

  expect(res.status).toBe(201);

  const created = await FlashcardSet.findOne({ title: 'My own deck' });
  const entries = await LibraryEntry.find({ profile: profile._id });
  expect(entries).toHaveLength(1);
  expect(String(entries[0].set)).toBe(String(created?._id));
});

it('puts an API created set on the author shelf', async () => {
  const res = await createApiSet(
    new NextRequest('https://flashlearnai.witus.online/api/v1/sets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Partner deck',
        flashcards: [{ front: 'q', back: 'a' }],
      }),
    }),
  );

  expect(res.status).toBe(201);

  const profile = await Profile.findOne({ user: API_USER_ID });
  const created = await FlashcardSet.findOne({ title: 'Partner deck' });
  const entries = await LibraryEntry.find({ profile: profile?._id });
  expect(entries).toHaveLength(1);
  expect(String(entries[0].set)).toBe(String(created?._id));
});
