/**
 * @jest-environment node
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EcosystemSession } from '@/models/EcosystemSession';
import { CardAttempt } from '@/models/CardAttempt';
import { assembleSessionCompletedPayload } from '@/lib/api/sessionPayload';

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
  await Promise.all([
    EcosystemSession.deleteMany({}),
    CardAttempt.deleteMany({}),
  ]);
});

describe('assembleSessionCompletedPayload', () => {
  it('returns null when the session does not exist', async () => {
    expect(await assembleSessionCompletedPayload('nope')).toBeNull();
  });

  it('builds a session.completed payload from a session + attempts', async () => {
    const apiKeyId = new Types.ObjectId();
    const setId = new Types.ObjectId();
    const card1 = new Types.ObjectId();
    const card2 = new Types.ObjectId();
    const completedAt = new Date('2026-04-27T12:00:00Z');

    await EcosystemSession.create({
      sessionId: 'sess-1',
      apiKeyId,
      childId: 'child-A',
      ageBand: '4-7',
      standards: [{ framework: 'indiana-k', code: 'K.NS.1' }],
      sourceContext: { consumer: 'test', completedAt },
      flashcardSetId: setId,
      estimatedCardCount: 2,
      scheduledFor: new Date(),
      status: 'completed',
      completedAt,
    });
    await CardAttempt.create({
      apiKeyId, childId: 'child-A', sessionId: 'sess-1', cardId: card1,
      standardCodes: [{ framework: 'indiana-k', code: 'K.NS.1' }],
      attemptNumber: 1, correctOnFirstAttempt: true, isCorrect: true,
      latencyMs: 1200, attemptedAt: new Date(),
    });
    await CardAttempt.create({
      apiKeyId, childId: 'child-A', sessionId: 'sess-1', cardId: card2,
      standardCodes: [{ framework: 'indiana-k', code: 'K.NS.1' }],
      attemptNumber: 1, correctOnFirstAttempt: false, isCorrect: false,
      latencyMs: 4200, attemptedAt: new Date(),
    });
    await CardAttempt.create({
      apiKeyId, childId: 'child-A', sessionId: 'sess-1', cardId: card2,
      standardCodes: [{ framework: 'indiana-k', code: 'K.NS.1' }],
      attemptNumber: 2, correctOnFirstAttempt: false, isCorrect: true,
      latencyMs: 2100, attemptedAt: new Date(),
    });

    const p = await assembleSessionCompletedPayload('sess-1');
    expect(p).not.toBeNull();
    expect(p!.type).toBe('session.completed');
    expect(p!.sessionId).toBe('sess-1');
    expect(p!.childId).toBe('child-A');
    expect(p!.completedAt).toBe(completedAt.toISOString());
    expect(p!.cards).toHaveLength(2);

    const c1 = p!.cards.find((c) => c.cardId === String(card1))!;
    expect(c1.correctOnFirstAttempt).toBe(true);
    expect(c1.attempts).toBe(1);
    expect(c1.latencyMs).toBe(1200);
    expect(c1.standardCode).toBe('K.NS.1');

    const c2 = p!.cards.find((c) => c.cardId === String(card2))!;
    expect(c2.correctOnFirstAttempt).toBe(false);
    expect(c2.attempts).toBe(2);
    expect(c2.latencyMs).toBe(4200 + 2100);
  });

  it('returns an empty cards array when the session has no attempts yet', async () => {
    await EcosystemSession.create({
      sessionId: 'sess-empty',
      apiKeyId: new Types.ObjectId(),
      childId: 'child-X',
      ageBand: '4-7',
      standards: [{ framework: 'indiana-k', code: 'K.NS.1' }],
      sourceContext: { consumer: 'test', completedAt: new Date() },
      flashcardSetId: new Types.ObjectId(),
      estimatedCardCount: 0,
      scheduledFor: new Date(),
    });
    const p = await assembleSessionCompletedPayload('sess-empty');
    expect(p!.cards).toEqual([]);
  });
});
