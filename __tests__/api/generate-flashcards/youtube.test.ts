/**
 * @jest-environment node
 *
 * POST /api/generate-flashcards/youtube
 *
 * Two outbound calls cost something here: the transcript fetch and the provider
 * call. Every rejection test therefore asserts that neither one happened. The
 * transcript library and the provider are both replaced, so nothing leaves the
 * machine.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('../../../lib/constants', () => ({ FLASHCARD_MIN: 5, FLASHCARD_MAX: 20 }));
jest.mock('../../../lib/appConfigValues', () => ({ getFlashcardMax: async () => 20 }));

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
  LogContext: { AI: 'ai', SYSTEM: 'system' },
}));

let mockRateLimitResult: { limited: boolean; reason?: string } = { limited: false };
const mockIncrementGenerationCount = jest.fn(async (_userId: string) => undefined);
jest.mock('../../../lib/ratelimit/rateLimitGemini', () => ({
  checkRateLimit: async () => mockRateLimitResult,
  incrementGenerationCount: (userId: string) => mockIncrementGenerationCount(userId),
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
jest.mock('../../../lib/ai/generate', () => ({
  generateFlashcards: (opts: { prompt: string }) => mockGenerateFlashcards(opts),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate-flashcards/youtube/route';

const USER_ID = '64d000000000000000000003';
const VIDEO_ID = 'dQw4w9WgXcQ';

beforeEach(() => {
  mockSession = { user: { id: USER_ID, role: 'Student' } };
  mockRateLimitResult = { limited: false };
});

afterEach(() => {
  jest.clearAllMocks();
});

function youtubeRequest(body: unknown) {
  return new NextRequest('https://flashlearnai.witus.online/api/generate-flashcards/youtube', {
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
    videoId?: string;
    transcriptLength?: number;
    flashcards?: Array<{ front: string; back: string }>;
  };
}

function nothingWasSpent() {
  expect(mockFetchTranscript).not.toHaveBeenCalled();
  expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  expect(mockIncrementGenerationCount).not.toHaveBeenCalled();
}

describe('POST /api/generate-flashcards/youtube: gates', () => {
  it('rejects an unauthenticated caller', async () => {
    mockSession = null;

    const res = await POST(youtubeRequest({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}` }));

    expect(res.status).toBe(401);
    nothingWasSpent();
  });

  it('turns away a caller who is over quota', async () => {
    mockRateLimitResult = { limited: true, reason: 'You have reached your limit.' };

    const res = await POST(youtubeRequest({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}` }));

    expect(res.status).toBe(429);
    expect((await readJson(res)).message).toBe('You have reached your limit.');
    nothingWasSpent();
  });
});

describe('POST /api/generate-flashcards/youtube: input rejected before spending', () => {
  it('rejects a missing url', async () => {
    const res = await POST(youtubeRequest({}));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('YouTube URL is required');
    nothingWasSpent();
  });

  it('rejects a url that is not a string', async () => {
    const res = await POST(youtubeRequest({ url: 12345 }));

    expect(res.status).toBe(400);
    nothingWasSpent();
  });

  it('rejects a url with no video id in it', async () => {
    const res = await POST(youtubeRequest({ url: 'https://example.com/not-a-video' }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('Invalid YouTube URL');
    nothingWasSpent();
  });

  it('rejects instructions longer than the 500 character cap', async () => {
    const res = await POST(
      youtubeRequest({
        url: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
        prompt: 'a'.repeat(501),
      }),
    );

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/500 characters or fewer/);
    nothingWasSpent();
  });

  it('answers a body that is not JSON with 500 and spends nothing', async () => {
    const res = await POST(youtubeRequest('not json at all'));

    expect(res.status).toBe(500);
    nothingWasSpent();
  });
});

describe('POST /api/generate-flashcards/youtube: transcript handling', () => {
  it('accepts a full watch url', async () => {
    const res = await POST(youtubeRequest({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}` }));

    expect(res.status).toBe(200);
    expect((await readJson(res)).videoId).toBe(VIDEO_ID);
    expect(mockFetchTranscript).toHaveBeenCalledWith(VIDEO_ID);
  });

  it('accepts a short youtu.be url', async () => {
    const res = await POST(youtubeRequest({ url: `https://youtu.be/${VIDEO_ID}` }));

    expect((await readJson(res)).videoId).toBe(VIDEO_ID);
  });

  it('accepts a bare video id', async () => {
    const res = await POST(youtubeRequest({ url: ` ${VIDEO_ID} ` }));

    expect((await readJson(res)).videoId).toBe(VIDEO_ID);
  });

  it('reports a video with no captions as a client error', async () => {
    mockFetchTranscript.mockRejectedValueOnce(new Error('no captions'));

    const res = await POST(youtubeRequest({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}` }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/may not have captions/);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
    expect(mockIncrementGenerationCount).not.toHaveBeenCalled();
  });

  it('reports an empty transcript as a client error', async () => {
    mockFetchTranscript.mockResolvedValueOnce([]);

    const res = await POST(youtubeRequest({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}` }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('No transcript available for this video.');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('truncates a very long transcript to 50000 characters', async () => {
    mockFetchTranscript.mockResolvedValueOnce([{ text: 'y'.repeat(60_000) }]);

    const body = await readJson(
      await POST(youtubeRequest({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}` })),
    );

    expect(body.transcriptLength).toBe(50_000);
    expect(mockGenerateFlashcards.mock.calls[0][0].prompt).not.toContain('y'.repeat(50_001));
  });
});

describe('POST /api/generate-flashcards/youtube: the provider call', () => {
  it('sends the transcript and the card count cap', async () => {
    await POST(youtubeRequest({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}` }));

    const prompt = mockGenerateFlashcards.mock.calls[0][0].prompt;
    expect(prompt).toContain('Generate 5 to 20 high-quality flashcards.');
    expect(prompt).toContain('recall is harder than recognition');
  });

  it('counts the generation once it succeeds', async () => {
    const body = await readJson(
      await POST(youtubeRequest({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}` })),
    );

    expect(body.source).toBe('youtube');
    expect(body.flashcards).toHaveLength(1);
    expect(mockIncrementGenerationCount).toHaveBeenCalledWith(USER_ID);
  });

  it('returns 500 and charges nothing when the provider returns no cards', async () => {
    mockGenerateFlashcards.mockResolvedValueOnce([]);

    const res = await POST(youtubeRequest({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}` }));

    expect(res.status).toBe(500);
    expect(mockIncrementGenerationCount).not.toHaveBeenCalled();
  });

  it('passes a provider rate limit back as a 429', async () => {
    mockGenerateFlashcards.mockRejectedValueOnce(Object.assign(new Error('quota'), { status: 429 }));

    const res = await POST(youtubeRequest({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}` }));

    expect(res.status).toBe(429);
    expect(mockIncrementGenerationCount).not.toHaveBeenCalled();
  });
});
