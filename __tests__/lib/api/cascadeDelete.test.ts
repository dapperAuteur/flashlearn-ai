/**
 * @jest-environment node
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EcosystemSession } from '@/models/EcosystemSession';
import { CardAttempt } from '@/models/CardAttempt';
import { MasteryRollup } from '@/models/MasteryRollup';
import { WebhookDelivery } from '@/models/WebhookDelivery';
import { FlashcardSet } from '@/models/FlashcardSet';
import { CascadePurgeLog } from '@/models/CascadePurgeLog';
import { purgeChildData, hasPriorPurge } from '@/lib/api/cascadeDelete';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  // Single-node — purgeChildData uses no transactions, so a replica set
  // would buy nothing and is unstable on Darwin/arm64.
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await Promise.all([
    EcosystemSession.deleteMany({}),
    CardAttempt.deleteMany({}),
    MasteryRollup.deleteMany({}),
    WebhookDelivery.deleteMany({}),
    FlashcardSet.deleteMany({}),
    CascadePurgeLog.deleteMany({}),
  ]);
});

const meta = { requestId: 'req-test', requesterIp: '127.0.0.1' };

async function seedChildData(
  apiKeyId: Types.ObjectId,
  childId: string,
): Promise<{ flashcardSetId: Types.ObjectId; sessionId: string }> {
  // Use a fake profile id; FlashcardSet doesn't have a strict ref check at insert.
  const profileId = new Types.ObjectId();

  const set = await FlashcardSet.create({
    profile: profileId,
    title: 'Test deck',
    cardCount: 1,
    source: 'Prompt',
    isPublic: true,
    flashcards: [{ front: 'Q', back: 'A' }],
  });

  const sessionId = `sess-${Math.random().toString(36).slice(2)}`;
  await EcosystemSession.create({
    sessionId,
    apiKeyId,
    childId,
    ageBand: '4-7',
    standards: [{ framework: 'indiana-k', code: 'K.NS.1' }],
    sourceContext: { consumer: 'test', completedAt: new Date() },
    flashcardSetId: set._id,
    estimatedCardCount: 1,
    scheduledFor: new Date(Date.now() + 86400000),
    status: 'scheduled',
    qstashMessageId: 'qstash-msg-1',
  });

  await CardAttempt.create({
    apiKeyId,
    childId,
    sessionId,
    cardId: set.flashcards[0]._id,
    standardCodes: [{ framework: 'indiana-k', code: 'K.NS.1' }],
    attemptNumber: 1,
    correctOnFirstAttempt: true,
    isCorrect: true,
    latencyMs: 1200,
    attemptedAt: new Date(),
  });

  await MasteryRollup.create({
    apiKeyId,
    childId,
    framework: 'indiana-k',
    code: 'K.NS.1',
    state: 'practiced',
    firstAttemptCorrectRate: 1,
    recentFirstAttempts: [true],
    attemptCount: 1,
    firstAttemptCount: 1,
  });

  await WebhookDelivery.create({
    deliveryId: `del-${Math.random().toString(36).slice(2)}`,
    webhookEndpointId: new Types.ObjectId(),
    apiKeyId,
    childId,
    event: 'session.completed',
    payloadSnapshot: { sessionId, childId },
    signature: 'sha256=abc',
    attemptNumber: 1,
    lastAttemptAt: new Date(),
    status: 'pending',
    qstashMessageId: 'qstash-msg-2',
  });

  return { flashcardSetId: set._id, sessionId };
}

describe('purgeChildData', () => {
  it('deletes every collection scoped to (apiKeyId, childId) and returns counts', async () => {
    const apiKeyId = new Types.ObjectId();
    await seedChildData(apiKeyId, 'child-A');

    const result = await purgeChildData(apiKeyId, 'child-A', meta);

    expect(result.purgedRecordCount).toBeGreaterThan(0);
    expect(result.byCollection).toEqual({
      webhook_deliveries: 1,
      card_attempts: 1,
      mastery_rollups: 1,
      flashcard_sets: 1,
      ecosystem_sessions: 1,
    });

    expect(await EcosystemSession.countDocuments({ apiKeyId, childId: 'child-A' })).toBe(0);
    expect(await CardAttempt.countDocuments({ apiKeyId, childId: 'child-A' })).toBe(0);
    expect(await MasteryRollup.countDocuments({ apiKeyId, childId: 'child-A' })).toBe(0);
    expect(await WebhookDelivery.countDocuments({ apiKeyId, childId: 'child-A' })).toBe(0);
    expect(await FlashcardSet.countDocuments({})).toBe(0);
  });

  it('writes a CascadePurgeLog row that marks the tuple as purged', async () => {
    const apiKeyId = new Types.ObjectId();
    await seedChildData(apiKeyId, 'child-B');

    expect(await hasPriorPurge(apiKeyId, 'child-B')).toBe(false);
    await purgeChildData(apiKeyId, 'child-B', meta);
    expect(await hasPriorPurge(apiKeyId, 'child-B')).toBe(true);

    const log = await CascadePurgeLog.findOne({ apiKeyId, childId: 'child-B' });
    expect(log).not.toBeNull();
    expect(log!.purgedRecordCount).toBeGreaterThan(0);
    expect(log!.byCollection.ecosystem_sessions).toBe(1);
    expect(log!.requestId).toBe('req-test');
  });

  it('only purges the targeted (apiKeyId, childId) — sibling rows survive', async () => {
    const apiKeyId = new Types.ObjectId();
    await seedChildData(apiKeyId, 'child-keep');
    await seedChildData(apiKeyId, 'child-purge');

    await purgeChildData(apiKeyId, 'child-purge', meta);

    expect(await EcosystemSession.countDocuments({ apiKeyId, childId: 'child-keep' })).toBe(1);
    expect(await CardAttempt.countDocuments({ apiKeyId, childId: 'child-keep' })).toBe(1);
    expect(await EcosystemSession.countDocuments({ apiKeyId, childId: 'child-purge' })).toBe(0);
  });

  it('idempotent: repeat purge returns 0 counts but still creates a log row', async () => {
    const apiKeyId = new Types.ObjectId();
    await seedChildData(apiKeyId, 'child-C');

    const first = await purgeChildData(apiKeyId, 'child-C', meta);
    expect(first.purgedRecordCount).toBeGreaterThan(0);

    const second = await purgeChildData(apiKeyId, 'child-C', meta);
    expect(second.purgedRecordCount).toBe(0);
    for (const v of Object.values(second.byCollection)) {
      expect(v).toBe(0);
    }

    expect(await CascadePurgeLog.countDocuments({ apiKeyId, childId: 'child-C' })).toBe(2);
  });

  it('zero-data purge still logs and reports zero — drives the route layer 404 vs 200 fork', async () => {
    const apiKeyId = new Types.ObjectId();
    expect(await hasPriorPurge(apiKeyId, 'unknown-child')).toBe(false);

    const result = await purgeChildData(apiKeyId, 'unknown-child', meta);
    expect(result.purgedRecordCount).toBe(0);
    expect(await hasPriorPurge(apiKeyId, 'unknown-child')).toBe(true);
  });

  it('invokes injected cancelQStashMessage for every pending message', async () => {
    const apiKeyId = new Types.ObjectId();
    await seedChildData(apiKeyId, 'child-D');

    const cancelled: string[] = [];
    const cancel = jest.fn(async (id: string) => { cancelled.push(id); });

    const result = await purgeChildData(apiKeyId, 'child-D', meta, { cancelQStashMessage: cancel });

    expect(cancel).toHaveBeenCalledTimes(2);
    expect(cancelled.sort()).toEqual(['qstash-msg-1', 'qstash-msg-2']);
    expect(result.cancelledQStashMessages).toBe(2);
  });

  it('survives cancelQStashMessage failures (best-effort cancellation)', async () => {
    const apiKeyId = new Types.ObjectId();
    await seedChildData(apiKeyId, 'child-E');

    const cancel = jest.fn(async () => { throw new Error('qstash 503'); });
    const result = await purgeChildData(apiKeyId, 'child-E', meta, { cancelQStashMessage: cancel });

    expect(cancel).toHaveBeenCalled();
    expect(result.cancelledQStashMessages).toBe(0);
    // Data still purged despite cancel errors.
    expect(await EcosystemSession.countDocuments({ apiKeyId, childId: 'child-E' })).toBe(0);
  });
});
