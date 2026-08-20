/**
 * @jest-environment node
 *
 * Variant assignment as it actually happens: in middleware, on "/", once.
 *
 * The lib-level suite proves the split is even and that a pinned cookie reads
 * back unchanged. This one proves the piece in between, that middleware assigns
 * exactly once and then leaves a returning visitor alone. If it reassigned on
 * every request, a visitor would see a different homepage on every load, the
 * cookie would be set-but-never-honoured, and the results table would be an
 * average of four designs shown to the same people rather than a comparison.
 */

jest.mock('next-auth/jwt', () => ({ getToken: jest.fn(async () => null) }));
jest.mock('../../lib/logging/edge-logger', () => ({
  edgeLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  EdgeLogContext: { AUTH: 'auth', SECURITY: 'security', SYSTEM: 'system' },
}));
jest.mock('../../lib/ratelimit/reconProbeLimit', () => ({
  checkReconProbeRateLimit: jest.fn(async () => ({ limited: false })),
}));

import type { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { HOME_AB_COOKIE, HOME_VARIANTS } from '@/lib/analytics/ab-test';

const originalFlag = process.env.HOMEPAGE_AB_TEST_ENABLED;

// middleware.ts reads NEXTAUTH_SECRET once at module scope and answers 500 to
// everything without it, so the value has to exist before the module loads.
// That rules out a static import here.
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret';
let middleware: (request: NextRequest) => Promise<NextResponse | Response>;

beforeAll(async () => {
  ({ middleware } = await import('@/middleware'));
});

function homepageRequest(cookie?: string) {
  return new NextRequest('http://localhost/', {
    headers: cookie ? { cookie: `${HOME_AB_COOKIE}=${cookie}` } : undefined,
  });
}

afterAll(() => {
  process.env.HOMEPAGE_AB_TEST_ENABLED = originalFlag;
});

describe('with the test switched on', () => {
  beforeEach(() => {
    process.env.HOMEPAGE_AB_TEST_ENABLED = 'true';
  });

  it('pins a first-time visitor to a registered arm', async () => {
    const res = (await middleware(homepageRequest())) as NextResponse;
    const cookie = res.cookies.get(HOME_AB_COOKIE);

    expect(cookie).toBeDefined();
    expect(HOME_VARIANTS).toContain(cookie!.value);
    expect(cookie!.path).toBe('/');
    expect(cookie!.maxAge).toBe(60 * 60 * 24 * 90);
  });

  it('leaves a returning visitor on the arm they already have', async () => {
    for (const variant of HOME_VARIANTS) {
      const res = (await middleware(homepageRequest(variant))) as NextResponse;
      // No new Set-Cookie at all: the existing pin is what the page will read.
      expect(res.cookies.get(HOME_AB_COOKIE)).toBeUndefined();
    }
  });

  it('keeps one visitor on one arm across a whole session', async () => {
    // First load assigns; every later load carries the cookie back.
    const first = (await middleware(homepageRequest())) as NextResponse;
    const assigned = first.cookies.get(HOME_AB_COOKIE)!.value;

    for (let load = 0; load < 20; load += 1) {
      const res = (await middleware(homepageRequest(assigned))) as NextResponse;
      expect(res.cookies.get(HOME_AB_COOKIE)).toBeUndefined();
    }

    expect(HOME_VARIANTS).toContain(assigned);
  });

  it('assigns only on the homepage', async () => {
    const res = (await middleware(new NextRequest('http://localhost/pricing'))) as NextResponse;
    expect(res.cookies.get(HOME_AB_COOKIE)).toBeUndefined();
  });

  it('reaches every arm over many first-time visitors', async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      const res = (await middleware(homepageRequest())) as NextResponse;
      seen.add(res.cookies.get(HOME_AB_COOKIE)!.value);
    }
    // Control has to be reachable too, or there is nothing to compare against.
    expect([...seen].sort()).toEqual([...HOME_VARIANTS].sort());
  });
});

describe('with the test switched off', () => {
  it('issues no variant cookie, so every visitor gets the control', async () => {
    process.env.HOMEPAGE_AB_TEST_ENABLED = 'false';
    const res = (await middleware(homepageRequest())) as NextResponse;
    expect(res.cookies.get(HOME_AB_COOKIE)).toBeUndefined();

    delete process.env.HOMEPAGE_AB_TEST_ENABLED;
    const unset = (await middleware(homepageRequest())) as NextResponse;
    expect(unset.cookies.get(HOME_AB_COOKIE)).toBeUndefined();
  });
});
