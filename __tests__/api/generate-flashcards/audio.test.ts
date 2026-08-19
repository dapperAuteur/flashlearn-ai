/**
 * @jest-environment node
 *
 * POST /api/generate-flashcards/audio
 *
 * Audio is held behind a "coming soon" gate, so the first job here is proving the
 * gate holds for everyone except an admin while the flag is off. After that it is
 * the same question as the other generation routes: is a bad request turned away
 * before the model is called?
 *
 * The feature flag and the quota gate both run for real against an in-memory
 * Mongo. Only the Gemini model handle from lib/constants is replaced, so no key,
 * model, or network is involved.
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
  LogContext: { AI: 'ai', SYSTEM: 'system' },
}));

// Typed rather than inferred: without the annotation TypeScript narrows text()
// to the exact default string, and every mockResolvedValueOnce with a different
// answer then fails to type-check.
interface ModelReply {
  response: { text: () => string };
}

const mockGenerateContent = jest.fn(
  async (): Promise<ModelReply> => ({
    response: {
      text: () =>
        '[{"front":"What is a mitochondrion?","back":"The powerhouse of the cell"},{"front":"Where is DNA stored?","back":"The nucleus"}]',
    },
  }),
);
// lib/constants also builds a Google client at import time; replacing the module
// keeps that out of the test run entirely.
// FLASHCARD_MAX is the default lib/appConfigValues falls back to, so it has to
// keep its real value here even though the route itself never reads it.
jest.mock('../../../lib/constants', () => ({
  FLASHCARD_MIN: 5,
  FLASHCARD_MAX: 20,
  MODEL: { generateContent: (...args: unknown[]) => mockGenerateContent(...(args as [])) },
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { User } from '@/models/User';
import { AppConfig } from '@/models/AppConfig';
import { POST } from '@/app/api/generate-flashcards/audio/route';

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
  await Promise.all([User.deleteMany({}), AppConfig.deleteMany({})]);
});

let seq = 0;

async function signIn(overrides: Record<string, unknown> = {}) {
  seq += 1;
  const user = await User.create({
    name: `Listener ${seq}`,
    email: `listener${seq}@example.com`,
    password: 'x',
    ...overrides,
  });
  mockSession = { user: { id: String(user._id), role: (overrides.role as string) ?? 'Student' } };
  return user;
}

async function enableAudioFlag(enabled: boolean) {
  await AppConfig.create({ key: 'FEATURE_FLAGS', value: { audioGeneration: enabled } });
}

function audioRequest(file: File | null, fields: Record<string, string> = {}) {
  const fd = new FormData();
  if (file) fd.set('file', file);
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return new NextRequest('https://flashlearnai.witus.online/api/generate-flashcards/audio', {
    method: 'POST',
    body: fd,
  });
}

function mp3(bytes = 32) {
  return new File([new Uint8Array(bytes)], 'lecture.mp3', { type: 'audio/mpeg' });
}

async function readJson(res: Response) {
  return (await res.json()) as {
    error?: string;
    message?: string;
    source?: string;
    fileName?: string;
    flashcards?: Array<{ front: string; back: string }>;
  };
}

function lastPrompt(): string {
  const [firstCall] = mockGenerateContent.mock.calls;
  if (!firstCall) throw new Error('The model was never called, so there is no prompt to read.');
  return (firstCall as unknown as string[][])[0][0];
}

describe('POST /api/generate-flashcards/audio: the coming soon gate', () => {
  it('rejects an unauthenticated caller', async () => {
    mockSession = null;

    const res = await POST(audioRequest(mp3()));

    expect(res.status).toBe(401);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('tells a signed-in non-admin the feature is coming soon while the flag is off', async () => {
    await signIn();

    const res = await POST(audioRequest(mp3()));

    expect(res.status).toBe(403);
    expect((await readJson(res)).error).toBe('Audio flashcard generation is coming soon.');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('holds the gate when the flag row exists and is false', async () => {
    await signIn({ role: 'Teacher' });
    await enableAudioFlag(false);

    const res = await POST(audioRequest(mp3()));

    expect(res.status).toBe(403);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('lets an admin through while the flag is off', async () => {
    await signIn({ role: 'Admin' });

    const res = await POST(audioRequest(mp3()));

    expect(res.status).toBe(200);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('lets everyone through once the flag is on', async () => {
    await signIn();
    await enableAudioFlag(true);

    const res = await POST(audioRequest(mp3()));

    expect(res.status).toBe(200);
  });
});

describe('POST /api/generate-flashcards/audio: quota gate', () => {
  it('turns away a Free user at the cap before calling the model', async () => {
    await signIn({ aiGenerationCount: 3, lastAiGenerationDate: new Date() });
    await enableAudioFlag(true);

    const res = await POST(audioRequest(mp3()));

    expect(res.status).toBe(429);
    expect((await readJson(res)).error).toBe('Too Many Requests');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('counts a successful generation', async () => {
    const user = await signIn({ aiGenerationCount: 1, lastAiGenerationDate: new Date() });
    await enableAudioFlag(true);

    await POST(audioRequest(mp3()));

    expect((await User.findById(user._id))!.aiGenerationCount).toBe(2);
  });
});

describe('POST /api/generate-flashcards/audio: input rejected before spending', () => {
  beforeEach(async () => {
    await signIn({ role: 'Admin' });
  });

  it('rejects a request with no file', async () => {
    const res = await POST(audioRequest(null));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('No audio file provided');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('rejects a file that is neither an audio type nor an audio extension', async () => {
    const file = new File([new Uint8Array(8)], 'notes.txt', { type: 'text/plain' });

    const res = await POST(audioRequest(file));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/Unsupported audio format/);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('accepts an audio extension even when the browser sends no mime type', async () => {
    const file = new File([new Uint8Array(8)], 'voice-note.m4a', { type: '' });

    const res = await POST(audioRequest(file));

    expect(res.status).toBe(200);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('rejects a file over the 25MB limit', async () => {
    const file = new File([new Uint8Array(26 * 1024 * 1024)], 'long.mp3', { type: 'audio/mpeg' });

    const res = await POST(audioRequest(file));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toBe('Audio file must be under 25MB');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  }, 30_000);

  it('rejects instructions longer than the 500 character cap', async () => {
    const res = await POST(audioRequest(mp3(), { prompt: 'a'.repeat(501) }));

    expect(res.status).toBe(400);
    expect((await readJson(res)).error).toMatch(/500 characters or fewer/);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});

describe('POST /api/generate-flashcards/audio: the prompt and the answer', () => {
  it('carries the configured card count cap into the prompt', async () => {
    await signIn({ role: 'Admin' });
    await AppConfig.create({ key: 'FLASHCARD_MAX', value: 7 });

    await POST(audioRequest(mp3()));

    expect(lastPrompt()).toContain('Generate 5 to 7 high-quality flashcards.');
  });

  it('falls back to the default cap of 20 when nothing is configured', async () => {
    await signIn({ role: 'Admin' });

    await POST(audioRequest(mp3()));

    expect(lastPrompt()).toContain('Generate 5 to 20 high-quality flashcards.');
  });

  it('wraps user instructions in the guidance-only block', async () => {
    await signIn({ role: 'Admin' });

    await POST(audioRequest(mp3(), { prompt: 'Focus on the vocabulary' }));

    const prompt = lastPrompt();
    expect(prompt).toContain('USER PREFERENCES');
    expect(prompt).toContain('Focus on the vocabulary');
  });

  it('returns the parsed cards and the file name', async () => {
    await signIn({ role: 'Admin' });

    const res = await POST(audioRequest(mp3()));
    const body = await readJson(res);

    expect(body.source).toBe('audio');
    expect(body.fileName).toBe('lecture.mp3');
    expect(body.flashcards).toHaveLength(2);
  });

  it('returns 500 and charges nothing when the model answer has no card array', async () => {
    const user = await signIn({ role: 'Admin', aiGenerationCount: 1, lastAiGenerationDate: new Date() });
    mockGenerateContent.mockResolvedValueOnce({ response: { text: () => 'I could not hear anything.' } });

    const res = await POST(audioRequest(mp3()));

    expect(res.status).toBe(500);
    expect((await User.findById(user._id))!.aiGenerationCount).toBe(1);
  });

  it('returns 500 and charges nothing when a card is missing its back', async () => {
    const user = await signIn({ role: 'Admin', aiGenerationCount: 1, lastAiGenerationDate: new Date() });
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => '[{"front":"Half a card"}]' },
    });

    const res = await POST(audioRequest(mp3()));

    expect(res.status).toBe(500);
    expect((await User.findById(user._id))!.aiGenerationCount).toBe(1);
  });

  it('passes a provider rate limit back as a 429', async () => {
    await signIn({ role: 'Admin' });
    mockGenerateContent.mockRejectedValueOnce(Object.assign(new Error('quota'), { status: 429 }));

    const res = await POST(audioRequest(mp3()));

    expect(res.status).toBe(429);
    expect((await readJson(res)).error).toMatch(/rate limit reached/i);
  });
});
