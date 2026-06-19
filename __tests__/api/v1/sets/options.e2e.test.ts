/**
 * @jest-environment node
 *
 * Authored multiple-choice options round-trip through the v1 sets API:
 *   POST /api/v1/sets with options + correctOptionId → GET /api/v1/sets/[id]
 *   returns them; an invalid correctOptionId is rejected.
 */

jest.mock('../../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));

const TEST_USER_ID = '64b000000000000000000abc';

jest.mock('../../../../lib/api/withApiAuth', () => {
  const { apiSuccess, apiError, generateRequestId } = jest.requireActual('../../../../lib/api/apiResponse');
  const { Types } = jest.requireActual('mongoose');
  return {
    apiSuccess,
    apiError,
    generateRequestId,
    withApiAuth: (handler: (...args: unknown[]) => Promise<unknown>) => {
      return async (req: unknown) => {
        const ctx = {
          user: { _id: new Types.ObjectId(TEST_USER_ID) },
          apiKey: { _id: new Types.ObjectId('64a000000000000000000abc'), permissions: ['*'] },
          keyType: 'ecosystem',
          apiTier: 'Free',
        };
        return handler(req, ctx, 'req-test');
      };
    },
  };
});

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';

import { POST as createSet } from '@/app/api/v1/sets/route';
import { GET as getSet } from '@/app/api/v1/sets/[id]/route';

let mongod: MongoMemoryServer;
const BASE = 'https://flashlearnai.witus.online';

function postSetReq(body: unknown) {
  return new NextRequest(`${BASE}/api/v1/sets`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

async function readJson(res: { json: () => Promise<unknown> }) {
  return (await res.json()) as { data?: Record<string, unknown>; error?: Record<string, unknown> };
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
  await Promise.all([FlashcardSet.deleteMany({}), Profile.deleteMany({})]);
});

const optionCard = {
  front: 'Identify the muscle',
  back: 'Biceps brachii',
  externalId: 'ces:m1:q1',
  options: [
    { id: 'a', text: 'Biceps brachii' },
    { id: 'b', text: 'Triceps brachii' },
    { id: 'c', text: 'Deltoid' },
  ],
  correctOptionId: 'a',
};

describe('v1 sets API with authored options', () => {
  it('round-trips options through create and read', async () => {
    const created = await readJson(await createSet(postSetReq({ title: 'CES MC', flashcards: [optionCard] })));
    const setId = created.data!.id as string;
    expect(setId).toBeTruthy();

    // POST response already includes options.
    const createdCards = created.data!.flashcards as Array<{ options?: unknown; correctOptionId?: string }>;
    expect(createdCards[0].correctOptionId).toBe('a');
    expect(createdCards[0].options).toEqual(optionCard.options);

    const got = await readJson(await getSet(new NextRequest(`${BASE}/api/v1/sets/${setId}`)));
    const cards = got.data!.flashcards as Array<{ front: string; externalId?: string; options?: { id: string; text: string }[]; correctOptionId?: string }>;
    expect(cards).toHaveLength(1);
    expect(cards[0].correctOptionId).toBe('a');
    expect(cards[0].options).toEqual(optionCard.options);
    expect(cards[0].externalId).toBe('ces:m1:q1');
  });

  it('rejects a card whose correctOptionId matches no option', async () => {
    const res = await createSet(
      postSetReq({ title: 'Bad', flashcards: [{ ...optionCard, correctOptionId: 'zzz' }] }),
    );
    expect(res.status).toBe(400);
  });

  it('still accepts a plain card with no options', async () => {
    const created = await readJson(await createSet(postSetReq({ title: 'Plain', flashcards: [{ front: 'Q', back: 'A' }] })));
    const cards = created.data!.flashcards as Array<{ options?: unknown }>;
    expect(cards[0].options).toBeUndefined();
  });
});
