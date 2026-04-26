/**
 * @jest-environment node
 *
 * COPPA cascade end-to-end test (acceptance criterion #4 from the brief):
 *   create session → POST results → mastery 200 → DELETE child → mastery 404 → DELETE again 200 idempotent.
 *
 * We mock auth + AI generation + QStash so the test runs in-process against
 * mongodb-memory-server with no external dependencies. Route handlers are
 * imported AFTER the mocks are registered so the mocked modules are used.
 */

// Mocks — must be set up before any route imports.
const mockGenerate = jest.fn();
const mockPublishCalls: Array<{ url: string; body: { deliveryId: string }; delay?: number }> = [];

// Stub the two db modules whose load-time bodies require MONGODB_URI. Both
// withApiAuth → Logger → lib/db/mongodb and route handlers → lib/db/dbConnect
// would throw before our beforeAll mongoose connection runs. The test owns
// the mongoose connection (in-memory) via beforeAll, so these stubs are safe.
jest.mock('../../../../lib/db/dbConnect', () => ({
  __esModule: true,
  default: jest.fn(async () => {}),
}));
jest.mock('../../../../lib/db/mongodb', () => ({
  __esModule: true,
  default: Promise.resolve({}),
}));

jest.mock('../../../../lib/services/flashcardGeneration', () => ({
  generateFlashcardsFromAI: (...args: unknown[]) => mockGenerate(...args),
}));

jest.mock('../../../../lib/qstash/client', () => {
  return {
    qstashPublisher: {
      async publishJSON(args: { url: string; body: { deliveryId: string }; delay?: number }) {
        mockPublishCalls.push(args);
        return { messageId: `mock-msg-${mockPublishCalls.length}` };
      },
    },
    cancelQStashMessage: jest.fn(async () => {}),
    verifyQStashRequest: jest.fn(async () => true),
    getQStashClient: jest.fn(),
    getQStashReceiver: jest.fn(),
    _resetQStashClientsForTests: jest.fn(),
  };
});

// Bypass withApiAuth so we don't need real API keys + Redis. The wrapper is
// re-exported as a thin pass-through that injects our test ApiAuthContext.
const TEST_API_KEY_ID = '64a000000000000000000001';
const TEST_USER_ID = '64b000000000000000000001';

// Bypass withApiAuth entirely — pull apiSuccess/apiError from the underlying
// apiResponse module (which has no heavy transitive deps) and stub
// withApiAuth as a pass-through that injects a test ApiAuthContext. This
// avoids loading the real withApiAuth → ratelimit → Redis chain that would
// require live Upstash credentials.
jest.mock('../../../../lib/api/withApiAuth', () => {
  const { apiSuccess, apiError, generateRequestId } = jest.requireActual(
    '../../../../lib/api/apiResponse',
  );
  const { Types } = jest.requireActual('mongoose');
  return {
    apiSuccess,
    apiError,
    generateRequestId,
    withApiAuth: (handler: (...args: unknown[]) => Promise<unknown>) => {
      return async (req: unknown) => {
        const ctx = {
          user: { _id: new Types.ObjectId(TEST_USER_ID) },
          apiKey: {
            _id: new Types.ObjectId(TEST_API_KEY_ID),
            userId: new Types.ObjectId(TEST_USER_ID),
            permissions: ['*'],
          },
          keyType: 'ecosystem',
          apiTier: 'Free',
        };
        return handler(req, ctx, 'req-test');
      };
    },
  };
});

// Standard test imports happen after mocks.
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { CurriculumStandard } from '@/models/CurriculumStandard';
import { EcosystemSession } from '@/models/EcosystemSession';
import { CardAttempt } from '@/models/CardAttempt';
import { MasteryRollup } from '@/models/MasteryRollup';
import { CascadePurgeLog } from '@/models/CascadePurgeLog';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';
import { WebhookEndpoint } from '@/models/WebhookEndpoint';
import { WebhookDelivery } from '@/models/WebhookDelivery';
import { encryptWebhookSecret } from '@/lib/crypto/webhookSecret';

// Routes (imported after mocks).
import { POST as createSession } from '@/app/api/v1/sessions/route';
import { POST as postResults } from '@/app/api/v1/sessions/[sessionId]/results/route';
import { GET as getMastery } from '@/app/api/v1/mastery/[childId]/route';
import { DELETE as deleteChild } from '@/app/api/v1/children/[childId]/route';

let mongod: MongoMemoryServer;

const ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

beforeAll(async () => {
  process.env.WEBHOOK_ENCRYPTION_KEY = ENCRYPTION_KEY;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Seed a User + Profile so generate-route can attach the FlashcardSet.
  await User.create({
    _id: new Types.ObjectId(TEST_USER_ID),
    email: 'test@example.com',
    name: 'Test User',
    username: 'test-ecosystem-user',
  });
  await Profile.create({
    user: new Types.ObjectId(TEST_USER_ID),
    profileName: 'Default Profile',
  });

  // Seed the curriculum standard the test session references.
  await CurriculumStandard.create({
    framework: 'indiana-k',
    code: 'K.NS.1',
    title: 'Count by ones and tens',
    ageBand: '4-7',
    active: true,
  });
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  delete process.env.WEBHOOK_ENCRYPTION_KEY;
});

beforeEach(() => {
  mockGenerate.mockReset();
  mockPublishCalls.length = 0;
  // Default: 3 cards per generation call.
  mockGenerate.mockResolvedValue([
    { front: 'Q1', back: 'A1' },
    { front: 'Q2', back: 'A2' },
    { front: 'Q3', back: 'A3' },
  ]);
});

afterEach(async () => {
  await Promise.all([
    EcosystemSession.deleteMany({}),
    CardAttempt.deleteMany({}),
    MasteryRollup.deleteMany({}),
    CascadePurgeLog.deleteMany({}),
    WebhookEndpoint.deleteMany({}),
    WebhookDelivery.deleteMany({}),
    FlashcardSet.deleteMany({}),
  ]);
});

function makeReq(method: string, url: string, body?: unknown): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: { 'content-type': 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(url, init);
}

describe('COPPA cascade lifecycle (e2e)', () => {
  it('create session → results → mastery 200 → delete child → mastery 404 → re-delete 200 idempotent', async () => {
    // Register a webhook endpoint so the results POST will enqueue a delivery.
    await WebhookEndpoint.create({
      apiKeyId: new Types.ObjectId(TEST_API_KEY_ID),
      url: 'https://consumer.example.com/webhook',
      secretEncrypted: encryptWebhookSecret('whsec_test'),
      events: ['session.completed'],
      active: true,
    });

    // 1. Create session.
    const createReq = makeReq('POST', 'http://localhost/api/v1/sessions', {
      childId: 'child-coppa',
      ageBand: '4-7',
      standards: [{ framework: 'indiana-k', code: 'K.NS.1' }],
      sourceContext: { consumer: 'wanderlearn-stories', completedAt: new Date().toISOString() },
      tz: 'America/Indiana/Indianapolis',
    });
    const createRes = await createSession(createReq);
    expect(createRes.status).toBe(201);
    const createBody = (await createRes.json()) as { data: { sessionId: string; scheduledFor: string; estimatedCardCount: number } };
    const sessionId = createBody.data.sessionId;
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(createBody.data.estimatedCardCount).toBe(3);
    // scheduledFor is the next local midnight in the consumer's tz.
    // It's strictly in the future; precise distance depends on the local
    // hour at test runtime.
    expect(new Date(createBody.data.scheduledFor).getTime()).toBeGreaterThan(Date.now());

    // QStash should have been asked to schedule the session delivery.
    expect(mockPublishCalls.some((c) => c.url.includes('/qstash/deliver-session'))).toBe(true);

    // Confirm rollups are in the 'exposed' state right after creation.
    const exposed = await MasteryRollup.findOne({
      apiKeyId: new Types.ObjectId(TEST_API_KEY_ID),
      childId: 'child-coppa',
      framework: 'indiana-k',
      code: 'K.NS.1',
    });
    expect(exposed!.state).toBe('exposed');

    // 2. POST results — submit attempts on the generated cards.
    const session = await EcosystemSession.findOne({ sessionId });
    const set = await FlashcardSet.findById(session!.flashcardSetId);
    const cardIds = set!.flashcards.map((c: { _id: Types.ObjectId }) => String(c._id));

    mockPublishCalls.length = 0;

    const resultsReq = makeReq('POST', `http://localhost/api/v1/sessions/${sessionId}/results`, {
      cards: cardIds.map((id: string) => ({
        cardId: id,
        attempts: [{ isCorrect: true, latencyMs: 1500, attemptedAt: new Date().toISOString() }],
      })),
    });
    const resultsRes = await postResults(resultsReq);
    expect(resultsRes.status).toBe(200);
    const resultsBody = (await resultsRes.json()) as {
      data: { type: string; sessionId: string; cards: Array<{ cardId: string; correctOnFirstAttempt: boolean; attempts: number }> };
    };
    expect(resultsBody.data.type).toBe('session.completed');
    expect(resultsBody.data.sessionId).toBe(sessionId);
    expect(resultsBody.data.cards).toHaveLength(3);
    expect(resultsBody.data.cards.every((c) => c.correctOnFirstAttempt)).toBe(true);

    // The dispatcher should have enqueued exactly one webhook delivery for
    // our one registered endpoint.
    // (Allow a tick for the fire-and-forget enqueueDelivery to land.)
    await new Promise((r) => setTimeout(r, 50));
    const deliveries = await WebhookDelivery.find({ event: 'session.completed' });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].payloadSnapshot).toMatchObject({
      type: 'session.completed',
      sessionId,
      childId: 'child-coppa',
    });
    expect(mockPublishCalls.some((c) => c.url.includes('/qstash/deliver-webhook'))).toBe(true);

    // 3. GET mastery — should reflect the attempt.
    const masteryReq = makeReq('GET', `http://localhost/api/v1/mastery/child-coppa`);
    const masteryRes = await getMastery(masteryReq);
    expect(masteryRes.status).toBe(200);
    const masteryBody = (await masteryRes.json()) as {
      data: { childId: string; standards: Array<{ framework: string; code: string; state: string; attemptCount: number }> };
    };
    expect(masteryBody.data.childId).toBe('child-coppa');
    expect(masteryBody.data.standards).toHaveLength(1);
    expect(masteryBody.data.standards[0].state).toBe('practiced'); // 3 first-attempts isn't enough for demonstrated (window of 5)
    expect(masteryBody.data.standards[0].attemptCount).toBe(3);

    // 4. DELETE child — should cascade.
    const deleteReq = makeReq('DELETE', `http://localhost/api/v1/children/child-coppa`);
    const deleteRes = await deleteChild(deleteReq);
    expect(deleteRes.status).toBe(200);
    const deleteBody = (await deleteRes.json()) as { data: { deleted: boolean; purgedRecordCount: number } };
    expect(deleteBody.data.deleted).toBe(true);
    expect(deleteBody.data.purgedRecordCount).toBeGreaterThan(0);

    // 5. GET mastery — must now 404 (acceptance criterion explicitly).
    const masteryAfterReq = makeReq('GET', `http://localhost/api/v1/mastery/child-coppa`);
    const masteryAfterRes = await getMastery(masteryAfterReq);
    expect(masteryAfterRes.status).toBe(404);

    // 6. DELETE again — idempotent. Returns 200 with purgedRecordCount: 0
    // because a CascadePurgeLog row exists (and 404 only fires when nothing
    // was ever recorded for this child).
    const deleteAgainReq = makeReq('DELETE', `http://localhost/api/v1/children/child-coppa`);
    const deleteAgainRes = await deleteChild(deleteAgainReq);
    expect(deleteAgainRes.status).toBe(200);
    const deleteAgainBody = (await deleteAgainRes.json()) as { data: { deleted: boolean; purgedRecordCount: number } };
    expect(deleteAgainBody.data.purgedRecordCount).toBe(0);
  });

  it('DELETE on a never-seen child returns 404 (no purge log exists)', async () => {
    const req = makeReq('DELETE', 'http://localhost/api/v1/children/never-existed');
    const res = await deleteChild(req);
    expect(res.status).toBe(404);
  });

  it('GET mastery on a never-seen child returns 404', async () => {
    const req = makeReq('GET', 'http://localhost/api/v1/mastery/never-existed');
    const res = await getMastery(req);
    expect(res.status).toBe(404);
  });

  it('POST sessions rejects unknown standards with 400', async () => {
    const req = makeReq('POST', 'http://localhost/api/v1/sessions', {
      childId: 'child-bad',
      ageBand: '4-7',
      standards: [{ framework: 'indiana-k', code: 'K.NOT_REAL' }],
      sourceContext: { consumer: 'test', completedAt: new Date().toISOString() },
    });
    const res = await createSession(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; details?: { unknownStandards?: unknown[] } } };
    expect(body.error.code).toBe('INVALID_INPUT');
    expect(body.error.details?.unknownStandards).toEqual([{ framework: 'indiana-k', code: 'K.NOT_REAL' }]);
  });
});
