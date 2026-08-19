/**
 * @jest-environment node
 *
 * POST /api/v1/generate/pdf
 *
 * The real withApiAuth wrapper runs here; only the key lookup, the counters, the
 * PDF parser, and the provider are replaced. Every rejection test asserts that
 * neither the parser nor the provider was reached, so a bad request cannot spend
 * anything.
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

const USER_ID = '64e000000000000000000001';

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
  _id: { toString: () => 'set_pdf_1' },
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

let mockPdfText = 'The mitochondrion is the powerhouse of the cell, and it has two membranes.';
let mockPdfPages = 3;
const mockPdfParseConstructed = jest.fn();
jest.mock('pdf-parse', () => ({
  PDFParse: class {
    constructor(_opts: unknown) {
      mockPdfParseConstructed();
    }
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
jest.mock('../../../../lib/ai/generate', () => ({
  generateFlashcards: (opts: { prompt: string }) => mockGenerateFlashcards(opts),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/generate/pdf/route';

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
  return new NextRequest('https://flashlearnai.witus.online/api/v1/generate/pdf', {
    method: 'POST',
    headers: { authorization: 'Bearer fl_pub_test' },
    body: fd,
  });
}

async function readJson(res: Response) {
  return (await res.json()) as {
    data?: {
      flashcards?: Array<{ front: string; back: string }>;
      setId?: string;
      source?: string;
      cardCount?: number;
      pageCount?: number;
      textLength?: number;
    };
    error?: { code?: string; message?: string };
    meta?: { requestId?: string };
  };
}

function nothingWasSpent() {
  expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  expect(mockPdfParseConstructed).not.toHaveBeenCalled();
}

describe('POST /api/v1/generate/pdf: auth and quota gates', () => {
  it('rejects a caller with no API key', async () => {
    mockAuthResult = { error: 'Missing or malformed Authorization header.', status: 401 };

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(401);
    expect((await readJson(res)).error?.code).toBe('UNAUTHORIZED');
    nothingWasSpent();
  });

  it('rejects a key without the generate permission', async () => {
    mockAuthResult = authContext(['sets:read']);

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(403);
    const body = await readJson(res);
    expect(body.error?.code).toBe('FORBIDDEN');
    expect(body.error?.message).toMatch(/'generate' permission/);
    nothingWasSpent();
  });

  it('rejects a key type the endpoint does not serve', async () => {
    mockAuthResult = authContext(['*'], 'ecosystem');

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(403);
    nothingWasSpent();
  });

  it('turns away a caller over the monthly generation cap', async () => {
    mockQuota = { allowed: false, reason: 'Monthly generation limit of 20 reached.' };

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(429);
    const body = await readJson(res);
    expect(body.error?.code).toBe('QUOTA_EXCEEDED');
    expect(body.error?.message).toBe('Monthly generation limit of 20 reached.');
    nothingWasSpent();
  });

  it('turns away a caller over the burst limit', async () => {
    mockBurst = { allowed: false, limit: 60, remaining: 0, reset: 1_700_000_060 };

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(429);
    expect((await readJson(res)).error?.code).toBe('RATE_LIMIT_EXCEEDED');
    nothingWasSpent();
  });
});

describe('POST /api/v1/generate/pdf: input rejected before spending', () => {
  it('rejects a request with no file', async () => {
    const res = await POST(pdfRequest(null));

    expect(res.status).toBe(400);
    const body = await readJson(res);
    expect(body.error?.code).toBe('INVALID_INPUT');
    expect(body.error?.message).toBe('No PDF file provided');
    nothingWasSpent();
  });

  it('rejects a file that is not a PDF', async () => {
    const file = new File([new Uint8Array(8)], 'notes.txt', { type: 'text/plain' });

    const res = await POST(pdfRequest(file));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error?.message).toBe('File must be a PDF');
    nothingWasSpent();
  });

  it('rejects a file over the 20MB limit', async () => {
    const file = new File([new Uint8Array(21 * 1024 * 1024)], 'huge.pdf', {
      type: 'application/pdf',
    });

    const res = await POST(pdfRequest(file));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error?.message).toBe('PDF must be under 20MB');
    nothingWasSpent();
  }, 30_000);

  it('rejects instructions longer than the 500 character cap', async () => {
    const res = await POST(pdfRequest(pdf(), { prompt: 'a'.repeat(501) }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error?.message).toMatch(/500 characters or fewer/);
    nothingWasSpent();
  });

  it('rejects a scanned PDF that yields almost no text before the provider call', async () => {
    mockPdfText = 'page 1';

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error?.message).toMatch(/image-based/);
    expect(mockGenerateFlashcards).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/generate/pdf: the success envelope', () => {
  it('returns the same envelope as POST /api/v1/generate', async () => {
    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(201);
    const body = await readJson(res);
    expect(body.data?.setId).toBe('set_pdf_1');
    expect(body.data?.source).toBe('generated');
    expect(body.data?.cardCount).toBe(1);
    expect(body.data?.flashcards).toEqual([
      { front: 'What has two membranes?', back: 'The mitochondrion' },
    ]);
    expect(body.data?.pageCount).toBe(3);
    expect(body.meta?.requestId).toMatch(/^req_/);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
  });

  it('stores the set privately and marks its source as PDF', async () => {
    await POST(pdfRequest(pdf('biology-notes.pdf')));

    const doc = mockSetCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(doc.source).toBe('PDF');
    expect(doc.isPublic).toBe(false);
    expect(doc.title).toBe('biology-notes.pdf');
  });

  it('truncates a very long document to 50000 characters', async () => {
    mockPdfText = 'z'.repeat(60_000);

    const body = await readJson(await POST(pdfRequest(pdf())));

    expect(body.data?.textLength).toBe(50_000);
  });

  it('answers an empty provider result with 502 and creates no set', async () => {
    mockGenerateFlashcards.mockResolvedValueOnce([]);

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(502);
    expect((await readJson(res)).error?.code).toBe('AI_GENERATION_FAILED');
    expect(mockSetCreate).not.toHaveBeenCalled();
  });

  it('answers a provider failure with 502 and creates no set', async () => {
    mockGenerateFlashcards.mockRejectedValueOnce(Object.assign(new Error('quota'), { status: 429 }));

    const res = await POST(pdfRequest(pdf()));

    expect(res.status).toBe(502);
    expect(mockSetCreate).not.toHaveBeenCalled();
  });
});
