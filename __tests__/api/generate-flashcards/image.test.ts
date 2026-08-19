/**
 * @jest-environment node
 *
 * POST /api/generate-flashcards/image
 *
 * Vision calls are the most expensive of the four upload routes, so the tests
 * concentrate on what has to be rejected before the provider is reached: too many
 * files, the wrong type, an oversized file, and a caller who is over quota. The
 * provider seam (lib/ai/generate) and the quota gate are replaced; the quota gate
 * itself is exercised for real in prompt.test.ts.
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

const mockGenerateFlashcards = jest.fn(
  async (_opts: { prompt: string; imageDataUrls?: string[] }) => [
    { front: 'What does the diagram label as the anode?', back: 'The left electrode' },
  ],
);
jest.mock('../../../lib/ai/generate', () => ({
  generateFlashcards: (opts: { prompt: string; imageDataUrls?: string[] }) =>
    mockGenerateFlashcards(opts),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate-flashcards/image/route';

const USER_ID = '64d000000000000000000001';

beforeEach(() => {
  mockSession = { user: { id: USER_ID, role: 'Student' } };
  mockRateLimitResult = { limited: false };
});

afterEach(() => {
  jest.clearAllMocks();
});

function png(name = 'slide.png', bytes = 32) {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

function imageRequest(files: File[], fields: Record<string, string> = {}) {
  const fd = new FormData();
  for (const file of files) fd.append('files', file);
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return new NextRequest('https://flashlearnai.witus.online/api/generate-flashcards/image', {
    method: 'POST',
    body: fd,
  });
}

async function readJson(res: Response) {
  return (await res.json()) as {
    error?: string;
    message?: string;
    source?: string;
    imageCount?: number;
    flashcards?: Array<{ front: string; back: string }>;
  };
}

describe('POST /api/generate-flashcards/image: gates', () => {
  it('rejects an unauthenticated caller before any provider call', async () => {
    mockSession = null;

    const res = await POST(imageRequest([png()]));

    expect(res.status).toBe(401);
    expect((await readJson(res)).error).toBe('Unauthorized');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('turns away a caller who is over quota', async () => {
    mockRateLimitResult = { limited: true, reason: 'You have reached your limit.' };

    const res = await POST(imageRequest([png()]));

    expect(res.status).toBe(429);
    const body = await readJson(res);
    expect(body.error).toBe('Too Many Requests');
    expect(body.message).toBe('You have reached your limit.');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
    expect(mockIncrementGenerationCount).not.toHaveBeenCalled();
  });

  it('checks quota before it even looks at the upload', async () => {
    mockRateLimitResult = { limited: true, reason: 'over cap' };

    const res = await POST(imageRequest([]));

    expect(res.status).toBe(429);
  });
});

describe('POST /api/generate-flashcards/image: input rejected before spending', () => {
  it('rejects a request with no images', async () => {
    const res = await POST(imageRequest([]));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('No images provided');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('rejects more than five images', async () => {
    const res = await POST(imageRequest([png(), png(), png(), png(), png(), png()]));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('Maximum 5 images allowed');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('accepts exactly five images', async () => {
    const res = await POST(imageRequest([png(), png(), png(), png(), png()]));

    expect(res.status).toBe(200);
    expect((await readJson(res)).imageCount).toBe(5);
  });

  it('rejects a file type the vision model is not offered', async () => {
    const file = new File([new Uint8Array(8)], 'notes.pdf', { type: 'application/pdf' });

    const res = await POST(imageRequest([file]));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/Unsupported image type/);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('rejects the whole batch when one image is over 10MB', async () => {
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'huge.png', { type: 'image/png' });

    const res = await POST(imageRequest([png(), big]));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('Each image must be under 10MB');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  }, 30_000);

  it('rejects instructions longer than the 500 character cap', async () => {
    const res = await POST(imageRequest([png()], { prompt: 'a'.repeat(501) }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/500 characters or fewer/);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });
});

describe('POST /api/generate-flashcards/image: the provider call', () => {
  it('sends each image as a base64 data url alongside the prompt', async () => {
    const res = await POST(imageRequest([png('a.png'), png('b.png')]));

    expect(res.status).toBe(200);
    const opts = mockGenerateFlashcards.mock.calls[0][0];
    expect(opts.imageDataUrls).toHaveLength(2);
    expect(opts.imageDataUrls![0].startsWith('data:image/png;base64,')).toBe(true);
  });

  it('carries the card count cap into the prompt', async () => {
    await POST(imageRequest([png()]));

    expect(mockGenerateFlashcards.mock.calls[0][0].prompt).toContain(
      'Generate 5 to 20 high-quality flashcards.',
    );
  });

  it('counts the generation once it succeeds', async () => {
    const res = await POST(imageRequest([png()]));
    const body = await readJson(res);

    expect(body.source).toBe('image');
    expect(body.flashcards).toHaveLength(1);
    expect(mockIncrementGenerationCount).toHaveBeenCalledWith(USER_ID);
  });

  it('returns 500 and charges nothing when the provider returns no cards', async () => {
    mockGenerateFlashcards.mockResolvedValueOnce([]);

    const res = await POST(imageRequest([png()]));

    expect(res.status).toBe(500);
    expect(mockIncrementGenerationCount).not.toHaveBeenCalled();
  });

  it('passes a provider rate limit back as a 429', async () => {
    mockGenerateFlashcards.mockRejectedValueOnce(Object.assign(new Error('quota'), { status: 429 }));

    const res = await POST(imageRequest([png()]));

    expect(res.status).toBe(429);
    expect(mockIncrementGenerationCount).not.toHaveBeenCalled();
  });

  it('returns 500 and charges nothing when the provider throws', async () => {
    mockGenerateFlashcards.mockRejectedValueOnce(new Error('provider exploded'));

    const res = await POST(imageRequest([png()]));

    expect(res.status).toBe(500);
    expect(mockIncrementGenerationCount).not.toHaveBeenCalled();
  });
});
