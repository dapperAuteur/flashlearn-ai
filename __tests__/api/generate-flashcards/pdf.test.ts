/**
 * @jest-environment node
 *
 * POST /api/generate-flashcards/pdf
 *
 * The PDF parser and the provider are both replaced, so the suite can drive the
 * extracted text directly and check the two things that keep spend bounded: a bad
 * upload is rejected before the provider is called, and a very long document is
 * truncated rather than sent whole.
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

let mockPdfText = 'The mitochondrion is the powerhouse of the cell, and it has two membranes.';
let mockPdfPages = 3;
jest.mock('pdf-parse', () => ({
  PDFParse: class {
    async getText() {
      return { text: mockPdfText, total: mockPdfPages };
    }
    async destroy() {
      return undefined;
    }
  },
}));

const mockGenerateFlashcards = jest.fn(async (_opts: { prompt: string }) => [
  { front: 'What has two membranes?', back: 'The mitochondrion' },
]);
jest.mock('../../../lib/ai/generate', () => ({
  generateFlashcards: (opts: { prompt: string }) => mockGenerateFlashcards(opts),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate-flashcards/pdf/route';

const USER_ID = '64d000000000000000000002';

beforeEach(() => {
  mockSession = { user: { id: USER_ID, role: 'Student' } };
  mockRateLimitResult = { limited: false };
  mockPdfText = 'The mitochondrion is the powerhouse of the cell, and it has two membranes.';
  mockPdfPages = 3;
});

afterEach(() => {
  jest.clearAllMocks();
});

function pdf(name = 'chapter-4.pdf', bytes = 64) {
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });
}

function pdfRequest(file: File | null, fields: Record<string, string> = {}) {
  const fd = new FormData();
  if (file) fd.set('file', file);
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return new NextRequest('https://flashlearnai.witus.online/api/generate-flashcards/pdf', {
    method: 'POST',
    body: fd,
  });
}

async function readJson(res: Response) {
  return (await res.json()) as {
    error?: string;
    message?: string;
    source?: string;
    pageCount?: number;
    textLength?: number;
    flashcards?: Array<{ front: string; back: string }>;
  };
}

describe('POST /api/generate-flashcards/pdf: gates', () => {
  it('rejects an unauthenticated caller before any provider call', async () => {
    mockSession = null;

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(401);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('turns away a caller who is over quota', async () => {
    mockRateLimitResult = { limited: true, reason: 'You have reached your limit.' };

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(429);
    expect((await readJson(res)).message).toBe('You have reached your limit.');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
    expect(mockIncrementGenerationCount).not.toHaveBeenCalled();
  });
});

describe('POST /api/generate-flashcards/pdf: input rejected before spending', () => {
  it('rejects a request with no file', async () => {
    const res = await POST(pdfRequest(null));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('No PDF file provided');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('rejects a file that is not a PDF', async () => {
    const file = new File([new Uint8Array(8)], 'notes.txt', { type: 'text/plain' });

    const res = await POST(pdfRequest(file));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('File must be a PDF');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('rejects a file over the 20MB limit', async () => {
    const file = new File([new Uint8Array(21 * 1024 * 1024)], 'huge.pdf', {
      type: 'application/pdf',
    });

    const res = await POST(pdfRequest(file));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('PDF must be under 20MB');
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  }, 30_000);

  it('rejects instructions longer than the 500 character cap', async () => {
    const res = await POST(pdfRequest(pdf(), { prompt: 'a'.repeat(501) }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/500 characters or fewer/);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('rejects a scanned PDF that yields almost no text', async () => {
    mockPdfText = 'page 1';

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/image-based/);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });

  it('rejects a PDF that yields no text at all', async () => {
    mockPdfText = '   ';

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(400);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });
});

describe('POST /api/generate-flashcards/pdf: the provider call', () => {
  it('sends the extracted text and the card count cap', async () => {
    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(200);
    const prompt = mockGenerateFlashcards.mock.calls[0][0].prompt;
    expect(prompt).toContain('Generate 5 to 20 high-quality flashcards.');
    expect(prompt).toContain('powerhouse of the cell');
  });

  it('reports the page count and the text length it used', async () => {
    mockPdfPages = 12;

    const body = await readJson(await POST(pdfRequest(pdf())));

    expect(body.source).toBe('pdf');
    expect(body.pageCount).toBe(12);
    expect(body.textLength).toBe(mockPdfText.length);
    expect(mockIncrementGenerationCount).toHaveBeenCalledWith(USER_ID);
  });

  it('truncates a very long document to 50000 characters', async () => {
    mockPdfText = 'z'.repeat(60_000);

    const body = await readJson(await POST(pdfRequest(pdf())));

    expect(body.textLength).toBe(50_000);
    expect(mockGenerateFlashcards.mock.calls[0][0].prompt).not.toContain('z'.repeat(50_001));
  });

  it('returns 500 and charges nothing when the provider returns no cards', async () => {
    mockGenerateFlashcards.mockResolvedValueOnce([]);

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(500);
    expect(mockIncrementGenerationCount).not.toHaveBeenCalled();
  });

  it('passes a provider rate limit back as a 429', async () => {
    mockGenerateFlashcards.mockRejectedValueOnce(Object.assign(new Error('quota'), { status: 429 }));

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(429);
    expect(mockIncrementGenerationCount).not.toHaveBeenCalled();
  });
});
