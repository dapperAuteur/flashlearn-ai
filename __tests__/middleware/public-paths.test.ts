/**
 * @jest-environment node
 *
 * Which paths a signed-out visitor may load.
 *
 * '/' used to sit in the public list under a `startsWith` test, so every path
 * counted as public: /dashboard answered 200 signed out and the unverified-email
 * gate never ran (production, 2026-11-06). These tables pin both directions:
 * protected pages redirect to sign-in with a relative callbackUrl, and every
 * page the app links publicly still loads.
 */

let currentToken: Record<string, unknown> | null = null;

jest.mock('next-auth/jwt', () => ({ getToken: jest.fn(async () => currentToken) }));
jest.mock('../../lib/logging/edge-logger', () => ({
  edgeLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  EdgeLogContext: { AUTH: 'auth', SECURITY: 'security', SYSTEM: 'system' },
}));
jest.mock('../../lib/ratelimit/reconProbeLimit', () => ({
  checkReconProbeRateLimit: jest.fn(async () => ({ limited: false })),
}));

import type { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { isPublicPath, safeCallbackPath } from '@/lib/auth/publicPaths';

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret';
let middleware: (request: NextRequest) => Promise<NextResponse | Response>;

beforeAll(async () => {
  ({ middleware } = await import('@/middleware'));
});

afterEach(() => {
  currentToken = null;
});

const PUBLIC = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/error',
  '/verified',
  '/verification-error',
  '/claim',
  '/about',
  '/contact',
  '/pricing',
  '/privacy',
  '/terms',
  '/roadmap',
  '/road-map',
  '/changelog',
  '/blog',
  '/blog/x',
  '/press',
  '/press/launch',
  '/help',
  '/help/getting-started',
  '/docs/api',
  '/docs/api/webhooks',
  '/explore',
  '/study',
  '/sets/64d000000000000000000001',
  '/results/64d000000000000000000001',
  '/u/name',
  '/versus/how-it-works',
  '/versus/archive',
  '/versus/board/abc123',
  '/versus/preview/ABC123',
  '/offline',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/service-worker.js',
  '/images/cashapp-qr.jpg',
  '/file.svg',
  '/verbos-intensidad.csv',
  '/.well-known/security.txt',
];

const PROTECTED = [
  '/dashboard',
  '/flashcards',
  '/flashcards/export',
  '/generate',
  '/history',
  '/profile',
  '/settings',
  '/analytics',
  '/developer',
  '/developer/keys',
  '/team',
  '/team/create',
  '/versus',
  '/versus/create',
  '/versus/play/abc123',
  '/versus/results/abc123',
  '/versus/join/ABC123',
  '/versus/leaderboard',
  // Segment-prefix, not string-prefix: a public entry must not leak to a
  // sibling that merely starts with the same letters.
  '/blogroll',
  '/studyplan',
  '/username',
  '/versus/boards-admin',
];

describe('isPublicPath', () => {
  it.each(PUBLIC)('%s is public', (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(PROTECTED)('%s is protected', (path) => {
    expect(isPublicPath(path)).toBe(false);
  });

  it('treats "/" as the root only', () => {
    expect(isPublicPath('/')).toBe(true);
    expect(isPublicPath('/dashboard')).toBe(false);
  });
});

describe('middleware, signed out', () => {
  it.each(PROTECTED)('%s redirects to sign-in with a relative callbackUrl', async (path) => {
    const res = await middleware(new NextRequest(`https://flashlearnai.witus.online${path}?tab=1`));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/auth/signin');
    expect(location.searchParams.get('callbackUrl')).toBe(`${path}?tab=1`);
  });

  it.each(PUBLIC)('%s loads without a redirect', async (path) => {
    const res = await middleware(new NextRequest(`https://flashlearnai.witus.online${path}`));
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });
});

describe('middleware, signed in', () => {
  it('lets a verified user into /dashboard', async () => {
    currentToken = { sub: 'u1', role: 'Student', emailVerified: true };
    const res = await middleware(new NextRequest('https://flashlearnai.witus.online/dashboard'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('sends an unverified user on a protected page back to sign-in', async () => {
    currentToken = { sub: 'u1', role: 'Student', emailVerified: false };
    const res = await middleware(new NextRequest('https://flashlearnai.witus.online/dashboard'));
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/auth/signin');
    expect(location.searchParams.get('error')).toBe('email_not_verified');
  });

  it('leaves an unverified user alone on a public page', async () => {
    currentToken = { sub: 'u1', role: 'Student', emailVerified: false };
    const res = await middleware(new NextRequest('https://flashlearnai.witus.online/pricing'));
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('API routes are outside the middleware', () => {
  // Webhooks (Stripe, QStash), the v1 API-key routes, and next-auth's own
  // routes enforce their own auth. The matcher must keep skipping /api so this
  // change cannot redirect a webhook POST to an HTML sign-in page.
  it('matcher excludes /api and /ingest', async () => {
    const { config } = await import('@/middleware');
    const pattern = new RegExp(`^${config.matcher[0]}$`);
    for (const path of ['/api/stripe/webhook', '/api/v1/sets', '/api/auth/session', '/ingest/e']) {
      expect(pattern.test(path)).toBe(false);
    }
    expect(pattern.test('/dashboard')).toBe(true);
  });
});

describe('safeCallbackPath', () => {
  const origin = 'https://flashlearnai.witus.online';

  it.each([
    ['/dashboard', '/dashboard'],
    ['/versus/play/abc?x=1#h', '/versus/play/abc?x=1#h'],
    [`${origin}/generate?topic=a`, '/generate?topic=a'],
  ])('keeps the same-origin destination %s', (raw, expected) => {
    expect(safeCallbackPath(raw, origin)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    '',
    'https://evil.example/',
    'http://flashlearnai.witus.online.evil.example/',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
    'dashboard',
    '/auth/signin?callbackUrl=/x',
  ])('falls back for %p', (raw) => {
    expect(safeCallbackPath(raw as string | null | undefined, origin)).toBe('/flashcards');
  });

  it('rejects an absolute URL when no origin is known', () => {
    expect(safeCallbackPath(`${origin}/dashboard`, null)).toBe('/flashcards');
  });
});
