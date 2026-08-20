/**
 * @jest-environment node
 *
 * POST /api/help/:slug/feedback
 *
 * The buttons this route backs were rendered for months with no handler behind
 * them, on a server component, so every Yes and No anyone clicked was discarded
 * where it was clicked. These tests assert the two things that were missing:
 * the answer is recorded, and a comment left after a No actually leaves the
 * building.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';

const mirrorHelpFeedbackToInbox = jest.fn();
let currentSession: { user: { name?: string; email?: string } } | null = null;

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () => currentSession),
}));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/feedback/helpArticleFeedback', () => ({
  mirrorHelpFeedbackToInbox: (...args: unknown[]) => mirrorHelpFeedbackToInbox(...args),
}));
let mockRateLimitOk = true;
jest.mock('../../../lib/ratelimit/ratelimit', () => ({
  getRateLimiter: jest.fn(() => ({
    limit: jest.fn(async () => ({ success: mockRateLimitOk, reset: 60 })),
  })),
}));
jest.mock('../../../lib/logging/logger', () => ({
  Logger: { info: jest.fn(), warning: jest.fn(), error: jest.fn(async () => null) },
  LogContext: { SYSTEM: 'system' },
}));

import { HelpArticle } from '@/models/HelpArticle';
import { POST } from '@/app/api/help/[slug]/feedback/route';

let mongod: MongoMemoryServer;

const post = (slug: string, body: unknown) =>
  POST(
    new NextRequest(`http://localhost/api/help/${slug}/feedback`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    { params: Promise.resolve({ slug }) },
  );

const counts = async (slug: string) =>
  HelpArticle.findOne({ slug }).lean<{ helpfulYes: number; helpfulNo: number }>();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await HelpArticle.deleteMany({});
  await HelpArticle.create({
    slug: 'getting-started',
    title: 'Getting Started',
    category: 'getting-started',
    content: 'Body',
    excerpt: 'Short',
    isPublished: true,
  });
  mirrorHelpFeedbackToInbox.mockClear();
  currentSession = null;
  mockRateLimitOk = true;
});

describe('an answer is recorded', () => {
  it('counts a Yes from a reader who is not signed in', async () => {
    const res = await post('getting-started', { helpful: true });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ recorded: true, helpfulYes: 1 });

    expect(await counts('getting-started')).toMatchObject({ helpfulYes: 1, helpfulNo: 0 });
  });

  it('counts a No', async () => {
    await post('getting-started', { helpful: false });
    expect(await counts('getting-started')).toMatchObject({ helpfulYes: 0, helpfulNo: 1 });
  });

  it('accumulates rather than overwriting, so concurrent readers both count', async () => {
    await Promise.all([
      post('getting-started', { helpful: true }),
      post('getting-started', { helpful: true }),
      post('getting-started', { helpful: false }),
    ]);
    expect(await counts('getting-started')).toMatchObject({ helpfulYes: 2, helpfulNo: 1 });
  });

  it('refuses an unknown article', async () => {
    expect((await post('no-such-article', { helpful: true })).status).toBe(404);
  });

  it('refuses an unpublished one, so a draft cannot be rated', async () => {
    await HelpArticle.create({
      slug: 'draft',
      title: 'Draft',
      category: 'account',
      content: 'Body',
      isPublished: false,
    });
    expect((await post('draft', { helpful: true })).status).toBe(404);
  });

  it('rejects a body that is not a yes or a no', async () => {
    expect((await post('getting-started', { helpful: 'maybe' })).status).toBe(400);
    expect((await post('getting-started', {})).status).toBe(400);
    expect(await counts('getting-started')).toMatchObject({ helpfulYes: 0, helpfulNo: 0 });
  });
});

describe('a comment reaches triage', () => {
  it('sends the comment left after a No, with the article it is about', async () => {
    const res = await post('getting-started', {
      helpful: false,
      comment: 'It never says where the join code is.',
    });

    await expect(res.json()).resolves.toMatchObject({ commentSent: true });
    expect(mirrorHelpFeedbackToInbox).toHaveBeenCalledTimes(1);
    expect(mirrorHelpFeedbackToInbox).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'getting-started',
        title: 'Getting Started',
        comment: 'It never says where the join code is.',
      }),
    );
  });

  it('carries the reader details when they happen to be signed in', async () => {
    currentSession = { user: { name: 'Ada', email: 'ada@example.com' } };
    await post('getting-started', { helpful: false, comment: 'Still stuck.' });

    expect(mirrorHelpFeedbackToInbox).toHaveBeenCalledWith(
      expect.objectContaining({ submitterName: 'Ada', submitterEmail: 'ada@example.com' }),
    );
  });

  it('sends nothing for a bare No, since a thumbs-down is not a ticket', async () => {
    await post('getting-started', { helpful: false });
    expect(mirrorHelpFeedbackToInbox).not.toHaveBeenCalled();
  });

  it('sends nothing for a Yes, even when a comment is somehow attached', async () => {
    // The UI never offers a box on Yes. A hand-made request should not become
    // a way to post into the triage queue.
    await post('getting-started', { helpful: true, comment: 'unsolicited' });
    expect(mirrorHelpFeedbackToInbox).not.toHaveBeenCalled();
  });

  it('still counts the answer when the comment is only whitespace', async () => {
    await post('getting-started', { helpful: false, comment: '   ' });
    expect(mirrorHelpFeedbackToInbox).not.toHaveBeenCalled();
    expect(await counts('getting-started')).toMatchObject({ helpfulNo: 1 });
  });
});

describe('rate limiting', () => {
  it('refuses once a connection has answered too many times', async () => {
    mockRateLimitOk = false;
    const res = await post('getting-started', { helpful: true });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    // Nothing counted, so a blocked burst cannot move the numbers.
    expect(await counts('getting-started')).toMatchObject({ helpfulYes: 0 });
  });
});
