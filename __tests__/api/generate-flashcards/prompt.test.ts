/**
 * @jest-environment node
 *
 * POST /api/generate-flashcards
 *
 * Every request that gets past the gates here spends money with an AI provider,
 * so the tests care about two things: which requests are turned away, and whether
 * they are turned away before the provider is called.
 *
 * The quota gate (lib/ratelimit/rateLimitGemini) runs for real against an
 * in-memory Mongo, because a mocked limiter would prove nothing about the one
 * control that keeps generation spend bounded. Only the provider call itself is
 * replaced, at lib/ai/generate, so no key, model, or network is involved.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));

let mockSession: { user?: { id?: string; role?: string } } | null = null;
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () => mockSession),
}));

jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    debug: jest.fn(async () => null),
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: {
    AI: 'ai',
    AUTH: 'auth',
    USER: 'user',
    FLASHCARD: 'flashcard',
    SYSTEM: 'system',
  },
  AnalyticsLogger: {
    EventType: { SHARED_FLASHCARDS_USED: 'shared_flashcards_used' },
    trackEvent: jest.fn(async () => null),
    trackPromptSubmission: jest.fn(async () => null),
    trackAiGeneration: jest.fn(async () => null),
  },
}));

// The only AI seam. Mocking here rather than at the service layer keeps the test
// tied to the route's HTTP contract instead of to a helper that may move.
const mockGenerateFlashcards = jest.fn(
  async (_opts: { prompt: string }): Promise<Array<{ front: string; back: string }>> => [
    { front: 'What is 2 + 2?', back: '4' },
    { front: 'Capital of France?', back: 'Paris' },
  ],
);
jest.mock('../../../lib/ai/generate', () => ({
  generateFlashcards: (opts: { prompt: string }) => mockGenerateFlashcards(opts),
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { User } from '@/models/User';
import { Profile } from '@/models/Profile';
import { FlashcardSet } from '@/models/FlashcardSet';
import { POST } from '@/app/api/generate-flashcards/route';

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
  mockSession = null;
  await Promise.all([User.deleteMany({}), Profile.deleteMany({}), FlashcardSet.deleteMany({})]);
});

let seq = 0;

async function signIn(overrides: Record<string, unknown> = {}) {
  seq += 1;
  const user = await User.create({
    name: `Learner ${seq}`,
    email: `learner${seq}@example.com`,
    password: 'x',
    ...overrides,
  });
  mockSession = { user: { id: String(user._id), role: (overrides.role as string) ?? 'Student' } };
  return user;
}

function generateRequest(body: unknown) {
  return new NextRequest('https://flashlearnai.witus.online/api/generate-flashcards', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: new Headers({ 'content-type': 'application/json' }),
  });
}

async function readJson(res: Response) {
  return (await res.json()) as {
    error?: string;
    message?: string;
    source?: string;
    setId?: string;
    flashcards?: Array<{ front: string; back: string }>;
  };
}

describe('POST /api/generate-flashcards: access', () => {
  it('rejects an unauthenticated caller before any AI call', async () => {
    mockSession = null;

    const res = await POST(generateRequest({ topic: 'photosynthesis' }));

    expect(res.status).toBe(401);
    expect((await readJson(res)).error).toBe('Unauthorized');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('rejects a session with no user id', async () => {
    mockSession = { user: {} };

    const res = await POST(generateRequest({ topic: 'photosynthesis' }));

    expect(res.status).toBe(401);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });
});

describe('POST /api/generate-flashcards: input rejected before spending', () => {
  it('rejects a missing topic', async () => {
    await signIn();

    const res = await POST(generateRequest({}));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('Topic is required');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only topic', async () => {
    await signIn();

    const res = await POST(generateRequest({ topic: '   ' }));

    expect(res.status).toBe(400);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('rejects a topic that is not a string', async () => {
    await signIn();

    const res = await POST(generateRequest({ topic: 42 }));

    expect(res.status).toBe(400);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('rejects instructions longer than the 500 character cap', async () => {
    await signIn();

    const res = await POST(
      generateRequest({ topic: 'photosynthesis', instructions: 'a'.repeat(501) }),
    );

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/500 characters or fewer/);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('accepts instructions at exactly the cap', async () => {
    await signIn();

    const res = await POST(
      generateRequest({ topic: 'photosynthesis', instructions: 'b'.repeat(500) }),
    );

    expect(res.status).toBe(200);
    expect(mockGenerateFlashcards).toHaveBeenCalledTimes(1);
  });

  it('answers a body that is not JSON with 500 and no AI call', async () => {
    await signIn();

    const res = await POST(generateRequest('not json at all'));

    expect(res.status).toBe(500);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });
});

describe('POST /api/generate-flashcards: card count cap', () => {
  it('refuses a quantity from a non-admin', async () => {
    await signIn({ role: 'Teacher' });

    const res = await POST(generateRequest({ topic: 'photosynthesis', quantity: 10 }));

    expect(res.status).toBe(403);
    expect((await readJson(res)).error).toMatch(/admin-only/);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('refuses a quantity above the admin maximum of 50', async () => {
    await signIn({ role: 'Admin' });

    const res = await POST(generateRequest({ topic: 'photosynthesis', quantity: 51 }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/between 1 and 50/);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('refuses a quantity below the admin minimum of 1', async () => {
    await signIn({ role: 'Admin' });

    const res = await POST(generateRequest({ topic: 'photosynthesis', quantity: 0 }));

    expect(res.status).toBe(400);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('refuses a non-integer quantity', async () => {
    await signIn({ role: 'Admin' });

    const res = await POST(generateRequest({ topic: 'photosynthesis', quantity: 12.5 }));

    expect(res.status).toBe(400);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('refuses a quantity that is not a number at all', async () => {
    await signIn({ role: 'Admin' });

    const res = await POST(generateRequest({ topic: 'photosynthesis', quantity: 'all of them' }));

    expect(res.status).toBe(400);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('allows an admin quantity at the maximum and passes it into the prompt', async () => {
    await signIn({ role: 'Admin' });

    const res = await POST(generateRequest({ topic: 'photosynthesis', quantity: 50 }));

    expect(res.status).toBe(200);
    const prompt = (mockGenerateFlashcards.mock.calls[0][0] as unknown as { prompt: string }).prompt;
    expect(prompt).toContain('generate exactly 50 flashcards');
  });

  it('asks for the default range when no quantity is given', async () => {
    await signIn();

    await POST(generateRequest({ topic: 'photosynthesis' }));

    const prompt = (mockGenerateFlashcards.mock.calls[0][0] as unknown as { prompt: string }).prompt;
    expect(prompt).toContain('generate a set of 5 to 20 flashcards');
  });
});

describe('POST /api/generate-flashcards: quota gate', () => {
  it('turns away a Free user who has used the whole allowance', async () => {
    await signIn({ aiGenerationCount: 3, lastAiGenerationDate: new Date() });

    const res = await POST(generateRequest({ topic: 'photosynthesis' }));

    expect(res.status).toBe(429);
    const body = await readJson(res);
    expect(body.error).toBe('Too Many Requests');
    expect(body.message).toMatch(/limit of 3 per 30 days/);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('turns away a Monthly Pro user at the paid allowance', async () => {
    await signIn({
      subscriptionTier: 'Monthly Pro',
      aiGenerationCount: 5,
      lastAiGenerationDate: new Date(),
    });

    const res = await POST(generateRequest({ topic: 'photosynthesis' }));

    expect(res.status).toBe(429);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('lets a Free user through one below the cap', async () => {
    await signIn({ aiGenerationCount: 2, lastAiGenerationDate: new Date() });

    const res = await POST(generateRequest({ topic: 'photosynthesis' }));

    expect(res.status).toBe(200);
    expect(mockGenerateFlashcards).toHaveBeenCalledTimes(1);
  });

  it('counts the generation so the next request is the one that trips the cap', async () => {
    const user = await signIn({ aiGenerationCount: 2, lastAiGenerationDate: new Date() });

    await POST(generateRequest({ topic: 'photosynthesis' }));

    const after = await User.findById(user._id);
    expect(after!.aiGenerationCount).toBe(3);
    expect(after!.lastAiGenerationDate).toBeTruthy();

    mockSession = { user: { id: String(user._id), role: 'Student' } };
    const second = await POST(generateRequest({ topic: 'mitochondria' }));
    expect(second.status).toBe(429);
    expect(mockGenerateFlashcards).toHaveBeenCalledTimes(1);
  });

  it('resets the count once the 30 day window has passed', async () => {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 45);
    const user = await signIn({ aiGenerationCount: 99, lastAiGenerationDate: staleDate });

    const res = await POST(generateRequest({ topic: 'photosynthesis' }));

    expect(res.status).toBe(200);
    // Reset to zero by the check, then incremented by the successful generation.
    expect((await User.findById(user._id))!.aiGenerationCount).toBe(1);
  });

  it('does not limit an admin', async () => {
    await signIn({ role: 'Admin', aiGenerationCount: 999, lastAiGenerationDate: new Date() });

    const res = await POST(generateRequest({ topic: 'photosynthesis' }));

    expect(res.status).toBe(200);
  });

  it('does not spend quota when the request never reaches the provider', async () => {
    const user = await signIn({ aiGenerationCount: 1, lastAiGenerationDate: new Date() });

    await POST(generateRequest({ topic: '' }));

    expect((await User.findById(user._id))!.aiGenerationCount).toBe(1);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });
});

describe('POST /api/generate-flashcards: results', () => {
  it('stores a new public set and returns it', async () => {
    const user = await signIn();

    const res = await POST(
      generateRequest({ topic: 'photosynthesis', title: 'Photosynthesis 101' }),
    );

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.source).toBe('generated');
    expect(body.flashcards).toHaveLength(2);

    const stored = await FlashcardSet.findById(body.setId);
    expect(stored!.title).toBe('Photosynthesis 101');
    expect(stored!.source).toBe('Prompt');
    expect(stored!.cardCount).toBe(2);
    const profile = await Profile.findOne({ user: user._id });
    expect(String(stored!.profile)).toBe(String(profile!._id));
  });

  it('serves an existing public set without calling the provider', async () => {
    const user = await signIn();
    const profile = await Profile.create({ user: user._id, profileName: 'Default Profile' });
    const existing = await FlashcardSet.create({
      profile: profile._id,
      title: 'us history',
      isPublic: true,
      source: 'Prompt',
      cardCount: 1,
      flashcards: [{ front: 'Who wrote the Declaration?', back: 'Thomas Jefferson' }],
    });

    const res = await POST(generateRequest({ topic: 'U.S. History!!' }));

    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.source).toBe('shared');
    expect(body.setId).toBe(String(existing._id));
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  /**
   * FINDING, not a fix. app/api/generate-flashcards/route.ts:101 increments
   * `usageCount` on the FlashcardSet, and route lines 116-119 read
   * `existingSet.ratings`. Neither field is declared in models/FlashcardSet.ts,
   * and mongoose strips unknown paths under the default strict mode, so the
   * increment is dropped and the rating block is always zeros. The same dropped
   * increment is at app/api/v1/generate/route.ts:42, and
   * app/api/v1/sets/explore/route.ts:37 sorts "most used" by that never-written
   * field. Current behaviour asserted so adding the schema fields breaks this
   * test on purpose.
   */
  it('does not actually record a use of the shared set', async () => {
    const user = await signIn();
    const profile = await Profile.create({ user: user._id, profileName: 'Default Profile' });
    const existing = await FlashcardSet.create({
      profile: profile._id,
      title: 'us history',
      isPublic: true,
      source: 'Prompt',
      cardCount: 1,
      flashcards: [{ front: 'Who wrote the Declaration?', back: 'Thomas Jefferson' }],
    });

    const res = await POST(generateRequest({ topic: 'US History' }));
    const body = (await res.json()) as { rating?: { average: number; count: number } };

    const stored = (await FlashcardSet.findById(existing._id)) as unknown as {
      usageCount?: number;
    };
    expect(stored.usageCount).toBeUndefined();
    expect(body.rating).toEqual({ average: 0, count: 0 });
  });

  it('does not charge quota for a set served from the shared cache', async () => {
    const user = await signIn({ aiGenerationCount: 1, lastAiGenerationDate: new Date() });
    const profile = await Profile.create({ user: user._id, profileName: 'Default Profile' });
    await FlashcardSet.create({
      profile: profile._id,
      title: 'us history',
      isPublic: true,
      source: 'Prompt',
      cardCount: 1,
      flashcards: [{ front: 'Who wrote the Declaration?', back: 'Thomas Jefferson' }],
    });

    await POST(generateRequest({ topic: 'US History' }));

    expect((await User.findById(user._id))!.aiGenerationCount).toBe(1);
  });

  it('skips the shared cache when an admin asks for an exact count', async () => {
    const user = await signIn({ role: 'Admin' });
    const profile = await Profile.create({ user: user._id, profileName: 'Default Profile' });
    await FlashcardSet.create({
      profile: profile._id,
      title: 'us history',
      isPublic: true,
      source: 'Prompt',
      cardCount: 1,
      flashcards: [{ front: 'Who wrote the Declaration?', back: 'Thomas Jefferson' }],
    });

    const res = await POST(generateRequest({ topic: 'US History', quantity: 12 }));

    expect((await readJson(res)).source).toBe('generated');
    expect(mockGenerateFlashcards).toHaveBeenCalledTimes(1);
  });

  /**
   * FINDING, not a fix. app/api/generate-flashcards/route.ts:129-138 answers an
   * empty provider result with a 400 and a message a user can act on, but that
   * branch is unreachable: lib/services/flashcardGeneration.ts:51-57 throws on an
   * empty array first, so the outer catch turns it into a generic 500. Money is
   * safe either way (the count is not incremented), but the caller gets the wrong
   * status and a message that says nothing. Current behaviour asserted.
   */
  it('returns 500, not 400, when the provider returns nothing', async () => {
    const user = await signIn({ aiGenerationCount: 1, lastAiGenerationDate: new Date() });
    mockGenerateFlashcards.mockResolvedValueOnce([]);

    const res = await POST(generateRequest({ topic: 'photosynthesis' }));

    expect(res.status).toBe(500);
    expect((await User.findById(user._id))!.aiGenerationCount).toBe(1);
  });

  it('returns 500 and charges nothing when the provider throws', async () => {
    const user = await signIn({ aiGenerationCount: 1, lastAiGenerationDate: new Date() });
    mockGenerateFlashcards.mockRejectedValueOnce(new Error('provider exploded'));

    const res = await POST(generateRequest({ topic: 'photosynthesis' }));

    expect(res.status).toBe(500);
    expect((await User.findById(user._id))!.aiGenerationCount).toBe(1);
    expect(await FlashcardSet.countDocuments({})).toBe(0);
  });
});
