/**
 * @jest-environment node
 *
 * End-to-end coverage for the per-student study path (Branch B):
 *   POST /study/external-results  → idempotent SM-2 ingest by externalStudentId
 *   GET  /study/analytics/[setId] → per-student read, isolated between students
 *   GET  /study/due-cards         → per-student due read
 *
 * Mocks db + withApiAuth (pass-through injecting a test ApiAuthContext) and runs
 * in-process against mongodb-memory-server. Routes are imported AFTER the mocks.
 */

jest.mock('../../../../lib/db/dbConnect', () => ({
  __esModule: true,
  default: jest.fn(async () => {}),
}));
jest.mock('../../../../lib/db/mongodb', () => ({
  __esModule: true,
  default: Promise.resolve({}),
}));

const TEST_API_KEY_ID = '64a000000000000000000001';
const TEST_USER_ID = '64b000000000000000000001';

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
          apiKey: { _id: new Types.ObjectId(TEST_API_KEY_ID), userId: new Types.ObjectId(TEST_USER_ID), permissions: ['*'] },
          keyType: 'ecosystem',
          apiTier: 'Free',
        };
        return handler(req, ctx, 'req-test');
      };
    },
  };
});

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';
import { ExternalStudyResult } from '@/models/ExternalStudyResult';
import { ExternalStudentCardState } from '@/models/ExternalStudentCardState';

import { POST as postExternalResults } from '@/app/api/v1/study/external-results/route';
import { GET as getAnalytics } from '@/app/api/v1/study/analytics/[setId]/route';
import { GET as getDueCards } from '@/app/api/v1/study/due-cards/route';

let mongod: MongoMemoryServer;
const PROFILE_ID = new Types.ObjectId('64c000000000000000000001');
const BASE = 'https://flashlearnai.witus.online';

async function seedSet(externalIds: string[]) {
  const set = await FlashcardSet.create({
    profile: PROFILE_ID,
    title: 'CES Glossary',
    isPublic: true,
    source: 'CSV',
    cardCount: externalIds.length,
    flashcards: externalIds.map((ext, i) => ({ front: `Q${i}`, back: `A${i}`, externalId: ext })),
  });
  return set;
}

function postResultsReq(body: unknown) {
  return new NextRequest(`${BASE}/api/v1/study/external-results`, {
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
  await User.create({ _id: new Types.ObjectId(TEST_USER_ID), email: 't@example.com', name: 'T', username: 'eco-study-user' });
  await Profile.create({ _id: PROFILE_ID, user: new Types.ObjectId(TEST_USER_ID), profileName: 'Default Profile' });
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await Promise.all([
    FlashcardSet.deleteMany({}),
    ExternalStudyResult.deleteMany({}),
    ExternalStudentCardState.deleteMany({}),
  ]);
});

describe('POST /study/external-results', () => {
  it('ingests results, projects per-student SM-2, and is idempotent on retry', async () => {
    const set = await seedSet(['q1', 'q2']);
    const body = {
      setId: String(set._id),
      externalStudentId: 'student-A',
      results: [
        { cardExternalId: 'q1', isCorrect: true, occurredAt: '2026-06-18T10:00:00Z' },
        { cardExternalId: 'q2', isCorrect: false, confidenceRating: 4, occurredAt: '2026-06-18T10:05:00Z' },
      ],
    };

    const first = await readJson(await postExternalResults(postResultsReq(body)));
    expect(first.data).toMatchObject({ applied: 2, duplicates: 0, unresolvedCardExternalIds: [] });

    let states = await ExternalStudentCardState.find({ externalStudentId: 'student-A' }).lean();
    expect(states).toHaveLength(2);
    const q2 = states.find((s) => s.cardExternalId === 'q2')!;
    expect(q2.incorrectCount).toBe(1);
    expect(q2.repetitions).toBe(0);

    // Retry the identical push: deduped, no double-count.
    const second = await readJson(await postExternalResults(postResultsReq(body)));
    expect(second.data).toMatchObject({ applied: 0, duplicates: 2 });

    states = await ExternalStudentCardState.find({ externalStudentId: 'student-A' }).lean();
    expect(states).toHaveLength(2);
    expect(states.find((s) => s.cardExternalId === 'q2')!.incorrectCount).toBe(1);
  });

  it('reports unresolved cardExternalIds instead of dropping them', async () => {
    const set = await seedSet(['q1']);
    const res = await readJson(
      await postExternalResults(
        postResultsReq({
          setId: String(set._id),
          externalStudentId: 'student-A',
          results: [{ cardExternalId: 'nope', isCorrect: true, occurredAt: '2026-06-18T10:00:00Z' }],
        }),
      ),
    );
    expect(res.data).toMatchObject({ applied: 0, unresolvedCardExternalIds: ['nope'] });
  });

  it('rejects a set the key owner does not own', async () => {
    const foreignSet = await FlashcardSet.create({
      profile: new Types.ObjectId('64c000000000000000000999'),
      title: 'Someone else', isPublic: true, source: 'CSV', cardCount: 1,
      flashcards: [{ front: 'Q', back: 'A', externalId: 'q1' }],
    });
    const res = await postExternalResults(
      postResultsReq({
        setId: String(foreignSet._id),
        externalStudentId: 'student-A',
        results: [{ cardExternalId: 'q1', isCorrect: true, occurredAt: '2026-06-18T10:00:00Z' }],
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe('per-student reads', () => {
  it('analytics are isolated between students', async () => {
    const set = await seedSet(['q1', 'q2']);
    await postExternalResults(
      postResultsReq({
        setId: String(set._id),
        externalStudentId: 'student-A',
        results: [{ cardExternalId: 'q1', isCorrect: true, occurredAt: '2026-06-18T10:00:00Z' }],
      }),
    );

    const aRes = await readJson(
      await getAnalytics(new NextRequest(`${BASE}/api/v1/study/analytics/${set._id}?externalStudentId=student-A`)),
    );
    const aAnalytics = aRes.data!.analytics as { cards: unknown[] };
    expect(aAnalytics.cards).toHaveLength(1);

    const bRes = await readJson(
      await getAnalytics(new NextRequest(`${BASE}/api/v1/study/analytics/${set._id}?externalStudentId=student-B`)),
    );
    expect(bRes.data!.analytics).toBeNull();
  });

  it('due-cards returns only cards past their review date for the student', async () => {
    const set = await seedSet(['q1', 'q2']);
    const past = new Date('2020-01-01T00:00:00Z');
    const future = new Date('2999-01-01T00:00:00Z');
    await ExternalStudentCardState.create({
      apiKeyId: new Types.ObjectId(TEST_API_KEY_ID), externalStudentId: 'student-A',
      setId: set._id, cardId: set.flashcards[0]._id, cardExternalId: 'q1', nextReviewDate: past,
    });
    await ExternalStudentCardState.create({
      apiKeyId: new Types.ObjectId(TEST_API_KEY_ID), externalStudentId: 'student-A',
      setId: set._id, cardId: set.flashcards[1]._id, cardExternalId: 'q2', nextReviewDate: future,
    });

    const res = await readJson(
      await getDueCards(new NextRequest(`${BASE}/api/v1/study/due-cards?externalStudentId=student-A&setId=${set._id}`)),
    );
    expect(res.data).toMatchObject({ totalDue: 1 });
    const sets = res.data!.sets as { dueCardIds: string[] }[];
    expect(sets[0].dueCardIds).toEqual([String(set.flashcards[0]._id)]);

    const bRes = await readJson(
      await getDueCards(new NextRequest(`${BASE}/api/v1/study/due-cards?externalStudentId=student-B`)),
    );
    expect(bRes.data).toMatchObject({ totalDue: 0 });
  });
});
