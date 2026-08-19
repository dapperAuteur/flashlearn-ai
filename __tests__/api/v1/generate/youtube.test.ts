/**
 * @jest-environment node
 *
 * POST /api/v1/generate/youtube
 *
 * The real withApiAuth wrapper runs here; only the key lookup, the counters, the
 * transcript library, and the provider are replaced. Two outbound calls cost
 * something on this route, so every rejection test asserts that neither the
 * transcript fetch nor the provider was reached.
 */

jest.mock('../../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('../../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../../lib/constants', () => ({ FLASHCARD_MIN: 5, FLASHCARD_MAX: 20 }));
jest.mock('../../../../lib/appConfigValues', () => ({ getFlashcardMax: async () => 20 }));

jest.mock('../../../../lib/logging/logger', () => ({
  Logger: {
    debug: jest.fn(async () => null),
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { AI: 'ai', SYSTEM: 'system', FLASHCARD: 'flashcard' },
  AnalyticsLogger: {
    trackEvent: jest.fn(async () => null),
    trackAiGeneration: jest.fn(async () => null),
    trackPromptSubmission: jest.fn(async () => null),
  },
}));

const USER_ID = '64e000000000000000000002';
const VIDEO_ID = 'dQw4w9WgXcQ';

type AuthResult =
  | { context: Record<string, unknown> }
  | { error: string; status: number };

let mockAuthResult: AuthResult;
jest.mock('../../../../lib/api/authenticateApiKey', () => ({
  authenticateApiKey: jest.fn(async () => mockAuthResult),
  detectKeyType: jest.fn(() => 'public'),
}));

let mockBurst: { allowed: boolean; limit: number; remaining: number; reset: number };
let mockQuota: { allowed: boolean; overage?: boolean; reason?: string };
const mockIncrementUsage = jest.fn(async () => undefined);
jest.mock('../../../../lib/ratelimit/rateLimitApi', () => ({
  checkBurstLimit: async () => mockBurst,
  checkMonthlyQuota: async () => mockQuota,
  incrementUsage: () => mockIncrementUsage(),
}));

jest.mock('../../../../models/ApiLog', () => ({ ApiLog: { create: jest.fn(async () => undefined) } }));

const mockSetCreate = jest.fn(async (doc: Record<string, unknown>) => ({
  ...doc,
  _id: { toString: () => 'set_yt_1' },
}));
jest.mock('../../../../models/FlashcardSet', () => ({
  FlashcardSet: { create: (doc: Record<string, unknown>) => mockSetCreate(doc) },
}));
jest.mock('../../../../models/Profile', () => ({
  Profile: {
    findOne: jest.fn(async () => ({ _id: 'profile_1' })),
    create: jest.fn(async () => ({ _id: 'profile_1' })),
  },
}));

const mockFetchTranscript = jest.fn(async (_videoId: string) => [
  { text: 'Spaced repetition works because' },
  { text: 'recall is harder than recognition.' },
]);
jest.mock('youtube-transcript', () => ({
  YoutubeTranscript: { fetchTranscript: (videoId: string) => mockFetchTranscript(videoId) },
}));

const mockGenerateFlashcards = jest.fn(async (_opts: { prompt: string }) => [
  { front: 'Why does spaced repetition work?', back: 'Recall is harder than recognition' },
]);
jest.mock('../../../../lib/ai/generate', () => ({
  generateFlashcards: (opts: { prompt: string }) => mockGenerateFlashcards(opts),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/generate/youtube/route';

function authContext(permissions: string[] = ['generate'], keyType = 'public') {
  return {
    context: {
      user: { _id: { toString: () => USER_ID } },
      apiKey: { _id: 'key_1', userId: 'user_1', permissions },
      keyType,
      apiTier: 'Free',
    },
  };
}

beforeEach(() => {
  mockAuthResult = authContext();
  mockBurst = { allowed: true, limit: 60, remaining: 59, reset: 1_700_000_000 };
  mockQuota = { allowed: true };
});

afterEach(() => {
  jest.clearAllMocks();
});

function ytRequest(body: unknown) {
  return new NextRequest('https://flashlearnai.witus.online/api/v1/generate/youtube', {
    method: 'POST',
    headers: { authorization: 'Bearer fl_pub_test', 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function readJson(res: Response) {
  return (await res.json()) as {
    data?: {
      flashcards?: Array<{ front: string; back: string }>;
      setId?: string;
      source?: string;
      cardCount?: number;
      videoId?: string;
      transcriptLength?: number;
    };
    error?: { code?: string; message?: string };
    meta?: { requestId?: string };
  };
}

function nothingWasSpent() {
  expect(mockFetchTranscript).not.toHaveBeenCalled();
  expect(mockGenerateFlashcards).not.toHaveBeenCalled();
}

describe('POST /api/v1/generate/youtube: auth and quota gates', () => {
  it('rejects a caller with no API key', async () => {
    mockAuthResult = { error: 'Missing or malformed Authorization header.', status: 401 };

    const res = await POST(ytRequest({ url: `https://youtu.be/${VIDEO_ID}` }));

    expect(res.status).toBe(401);
    expect((await readJson(res)).error?.code).toBe('UNAUTHORIZED');
    nothingWasSpent();
  });

  it('rejects a key without the generate permission', async () => {
    mockAuthResult = authContext(['sets:read']);

    const res = await POST(ytRequest({ url: `https://youtu.be/${VIDEO_ID}` }));

    expect(res.status).toBe(403);
    const body = await readJson(res);
    expect(body.error?.code).toBe('FORBIDDEN');
    expect(body.error?.message).toMatch(/'generate' permission/);
    nothingWasSpent();
  });

  it('rejects a key type the endpoint does not serve', async () => {
    mockAuthResult = authContext(['*'], 'ecosystem');

    const res = await POST(ytRequest({ url: `https://youtu.be/${VIDEO_ID}` }));

    expect(res.status).toBe(403);
    nothingWasSpent();
  });

  it('turns away a caller over the monthly generation cap', async () => {
    mockQuota = { allowed: false, reason: 'Monthly generation limit of 20 reached.' };

    const res = await POST(ytRequest({ url: `https://youtu.be/${VIDEO_ID}` }));

    expect(res.status).toBe(429);
    const body = await readJson(res);
    expect(body.error?.code).toBe('QUOTA_EXCEEDED');
    expect(body.error?.message).toBe('Monthly generation limit of 20 reached.');
    nothingWasSpent();
  });

  it('turns away a caller over the burst limit', async () => {
    mockBurst = { allowed: false, limit: 60, remaining: 0, reset: 1_700_000_060 };

    const res = await POST(ytRequest({ url: `https://youtu.be/${VIDEO_ID}` }));

    expect(res.status).toBe(429);
    expect((await readJson(res)).error?.code).toBe('RATE_LIMIT_EXCEEDED');
    nothingWasSpent();
  });
});

describe('POST /api/v1/generate/youtube: input rejected before spending', () => {
  it('rejects a body that is not JSON', async () => {
    const res = await POST(ytRequest('not json at all'));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error?.code).toBe('INVALID_INPUT');
    nothingWasSpent();
  });

  it('rejects a missing url', async () => {
    const res = await POST(ytRequest({}));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error?.message).toBe('YouTube URL is required');
    nothingWasSpent();
  });

  it('rejects a url that is not a string', async () => {
    const res = await POST(ytRequest({ url: 12345 }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error?.message).toBe('YouTube URL is required');
    nothingWasSpent();
  });

  it('rejects a url with no video id in it', async () => {
    const res = await POST(ytRequest({ url: 'https://example.com/watch' }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error?.message).toBe('Invalid YouTube URL');
    nothingWasSpent();
  });

  it('rejects instructions longer than the 500 character cap', async () => {
    const res = await POST(
      ytRequest({ url: `https://youtu.be/${VIDEO_ID}`, prompt: 'a'.repeat(501) })
    );

    expect(res.status).toBe(400);
    expect((await readJson(res)).error?.message).toMatch(/500 characters or fewer/);
    nothingWasSpent();
  });

  it('reports a video with no captions as a client error and spends nothing', async () => {
    mockFetchTranscript.mockRejectedValueOnce(new Error('no captions'));

    const res = await POST(ytRequest({ url: `https://youtu.be/${VIDEO_ID}` }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error?.message).toMatch(/captions/);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('reports an empty transcript as a client error', async () => {
    mockFetchTranscript.mockResolvedValueOnce([]);

    const res = await POST(ytRequest({ url: `https://youtu.be/${VIDEO_ID}` }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error?.message).toBe('No transcript available for this video.');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/generate/youtube: the success envelope', () => {
  it('returns the same envelope as POST /api/v1/generate', async () => {
    const res = await POST(ytRequest({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}` }));

    expect(res.status).toBe(201);
    const body = await readJson(res);
    expect(body.data?.setId).toBe('set_yt_1');
    expect(body.data?.source).toBe('generated');
    expect(body.data?.cardCount).toBe(1);
    expect(body.data?.videoId).toBe(VIDEO_ID);
    expect(body.meta?.requestId).toMatch(/^req_/);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
  });

  it('accepts a bare video id and stores the set privately', async () => {
    await POST(ytRequest({ url: VIDEO_ID }));

    expect(mockFetchTranscript).toHaveBeenCalledWith(VIDEO_ID);
    const doc = mockSetCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(doc.source).toBe('YouTube');
    expect(doc.isPublic).toBe(false);
  });

  it('truncates a very long transcript to 50000 characters', async () => {
    mockFetchTranscript.mockResolvedValueOnce([{ text: 'q'.repeat(60_000) }]);

    const body = await readJson(await POST(ytRequest({ url: VIDEO_ID })));

    expect(body.data?.transcriptLength).toBe(50_000);
  });

  it('answers an empty provider result with 502 and creates no set', async () => {
    mockGenerateFlashcards.mockResolvedValueOnce([]);

    const res = await POST(ytRequest({ url: VIDEO_ID }));

    expect(res.status).toBe(502);
    expect((await readJson(res)).error?.code).toBe('AI_GENERATION_FAILED');
    expect(mockSetCreate).not.toHaveBeenCalled();
  });

  it('answers a provider failure with 502 and creates no set', async () => {
    mockGenerateFlashcards.mockRejectedValueOnce(Object.assign(new Error('quota'), { status: 429 }));

    const res = await POST(ytRequest({ url: VIDEO_ID }));

    expect(res.status).toBe(502);
    expect(mockSetCreate).not.toHaveBeenCalled();
  });
});
