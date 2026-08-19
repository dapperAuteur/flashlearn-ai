/**
 * @jest-environment node
 *
 * The AI allowance is "N per 30 days". It used to be measured from the user's
 * LAST generation, which made it "N per 30 days of complete inactivity"
 * instead. Anyone who generated even once a month never reset: their count
 * climbed one at a time until it reached the cap and stayed there, on a tier
 * they were nowhere near using up.
 *
 * The steady-user test below is the one that matters. It fails against the old
 * logic and passes against the new.
 */
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/test';

jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/promo/promotions', () => ({ getActivePromotion: jest.fn(async () => null) }));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { checkRateLimit, incrementGenerationCount } from '@/lib/ratelimit/rateLimitGemini';
import { User } from '@/models/User';

let mongod: MongoMemoryServer;
let seq = 0;

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function makeUser(fields: Record<string, unknown> = {}) {
  seq += 1;
  return User.create({
    name: `Learner ${seq}`,
    email: `learner${seq}@example.com`,
    password: 'x',
    role: 'Student',
    subscriptionTier: 'Free',
    ...fields,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('the AI generation allowance period', () => {
  it('blocks a user who has spent the allowance inside the current period', async () => {
    // Free tier caps at 3 by default.
    const user = await makeUser({
      aiGenerationCount: 3,
      aiGenerationWindowStart: daysAgo(10),
      lastAiGenerationDate: daysAgo(1),
    });

    expect(await checkRateLimit(String(user._id))).toMatchObject({ limited: true });
  });

  it('starts a fresh period once 30 days have passed since it began', async () => {
    const user = await makeUser({
      aiGenerationCount: 3,
      aiGenerationWindowStart: daysAgo(31),
      lastAiGenerationDate: daysAgo(31),
    });

    expect(await checkRateLimit(String(user._id))).toMatchObject({ limited: false });

    const after = await User.findById(user._id).lean<{
      aiGenerationCount: number;
      aiGenerationWindowStart: Date;
    }>();
    expect(after!.aiGenerationCount).toBe(0);
    expect(after!.aiGenerationWindowStart.getTime()).toBeGreaterThan(daysAgo(1).getTime());
  });

  it('does not punish a steady user who generates once a month', async () => {
    // The regression this replaced. Someone generating a single set every 29
    // days kept refreshing lastAiGenerationDate, so the old check never saw an
    // expired window and their count climbed 1, 2, 3 until it hit the cap.
    // Their period began 31 days ago, so it has expired and should roll over
    // regardless of having generated yesterday.
    const user = await makeUser({
      aiGenerationCount: 3,
      aiGenerationWindowStart: daysAgo(31),
      lastAiGenerationDate: daysAgo(1),
    });

    expect(await checkRateLimit(String(user._id))).toMatchObject({ limited: false });
  });

  it('treats an account with no period start as fresh', async () => {
    const user = await makeUser();

    expect(await checkRateLimit(String(user._id))).toMatchObject({ limited: false });
  });

  it('falls back to the last generation date for accounts predating the field', async () => {
    // Migration path: aiGenerationWindowStart is absent, so the last generation
    // stands in. It is never later than the real period start, so nobody ends
    // up more restricted than they were.
    const stale = await makeUser({ aiGenerationCount: 3, lastAiGenerationDate: daysAgo(31) });
    expect(await checkRateLimit(String(stale._id))).toMatchObject({ limited: false });

    const recent = await makeUser({ aiGenerationCount: 3, lastAiGenerationDate: daysAgo(2) });
    expect(await checkRateLimit(String(recent._id))).toMatchObject({ limited: true });
  });

  it('never lets an Admin be limited', async () => {
    const admin = await makeUser({
      role: 'Admin',
      aiGenerationCount: 9999,
      aiGenerationWindowStart: daysAgo(1),
    });

    expect(await checkRateLimit(String(admin._id))).toMatchObject({ limited: false });
  });
});

describe('incrementGenerationCount', () => {
  it('sets the period start on the first generation', async () => {
    const user = await makeUser();

    await incrementGenerationCount(String(user._id));

    const after = await User.findById(user._id).lean<{
      aiGenerationCount: number;
      aiGenerationWindowStart?: Date;
    }>();
    expect(after!.aiGenerationCount).toBe(1);
    expect(after!.aiGenerationWindowStart).toBeInstanceOf(Date);
  });

  it('does not slide the period forward on later generations', async () => {
    // The heart of the old bug: every generation moved the marker the reset was
    // measured against, so the period could never end.
    const started = daysAgo(10);
    const user = await makeUser({ aiGenerationCount: 1, aiGenerationWindowStart: started });

    await incrementGenerationCount(String(user._id));
    await incrementGenerationCount(String(user._id));

    const after = await User.findById(user._id).lean<{
      aiGenerationCount: number;
      aiGenerationWindowStart: Date;
    }>();
    expect(after!.aiGenerationCount).toBe(3);
    expect(after!.aiGenerationWindowStart.getTime()).toBe(started.getTime());
  });
});
