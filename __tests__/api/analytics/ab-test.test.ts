/**
 * @jest-environment node
 *
 * The homepage A/B test event path, end to end:
 *
 *   POST /api/analytics/ab-test   (the client tracker writes here)
 *   GET  /api/analytics/ab-test   (/admin/ab-test reads here)
 *
 * The failure this suite exists to catch is a silent disconnect: events getting
 * written under names the aggregation never sums, or the dashboard reading a
 * field the route never returns. Either one produces a table of zeroes with no
 * error anywhere, and the test looks like "no signal yet" instead of "broken".
 * So the assertions name the fields the admin page actually reads.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';

let mockSession: { user: { id?: string; role?: string } } | null = null;

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(async () => mockSession),
}));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('../../../lib/db/dbConnect', () => ({
  __esModule: true,
  default: jest.fn(async () => undefined),
}));
// Imported at module load by the auth/logging chain and demands MONGODB_URI,
// which this suite supplies through mongodb-memory-server instead.
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { SYSTEM: 'system' },
}));

import { ABTestEvent } from '@/models/ABTestEvent';
import { GET, POST } from '@/app/api/analytics/ab-test/route';

/**
 * Every field app/(admin)/admin/ab-test/page.tsx destructures off a row of the
 * results table. Keeping the list here means renaming one in the route without
 * renaming it on the page fails this suite instead of the dashboard.
 */
const DASHBOARD_VARIANT_FIELDS = [
  'variant',
  'views',
  'signups',
  'signins',
  'generates',
  'studies',
  'dashboards',
  'conversionRate',
  'engagementRate',
] as const;

const DASHBOARD_TOP_LEVEL_FIELDS = [
  'test',
  'enabled',
  'variants',
  'totalViews',
  'generatedAt',
] as const;

let mongod: MongoMemoryServer;
const originalFlag = process.env.HOMEPAGE_AB_TEST_ENABLED;

function postEvent(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest('http://localhost/api/analytics/ab-test', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...headers },
    }),
  );
}

function getResults(test = 'home-hero') {
  return GET(new NextRequest(`http://localhost/api/analytics/ab-test?test=${test}`));
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  process.env.HOMEPAGE_AB_TEST_ENABLED = originalFlag;
});

beforeEach(async () => {
  await ABTestEvent.deleteMany({});
  process.env.HOMEPAGE_AB_TEST_ENABLED = 'true';
  mockSession = null;
});

describe('POST records what the aggregation sums', () => {
  it('stores an event under the test, variant, and event name the GET groups by', async () => {
    const res = await postEvent({
      test: 'home-hero',
      variant: 'b',
      event: 'signup_click',
      sessionId: 's_abc',
      referrer: 'https://example.com/blog',
    });
    expect(res.status).toBe(201);

    const row = await ABTestEvent.findOne({ sessionId: 's_abc' }).lean();
    expect(row).toMatchObject({
      test: 'home-hero',
      variant: 'b',
      event: 'signup_click',
      sessionId: 's_abc',
      referrer: 'https://example.com/blog',
    });
    expect(row).toHaveProperty('createdAt');
  });

  it('defaults an absent test name to the one the dashboard queries', async () => {
    await postEvent({ variant: 'a', event: 'view', sessionId: 's_no_test' });
    const row = await ABTestEvent.findOne({ sessionId: 's_no_test' })
      .lean<{ test?: string } | null>();
    expect(row?.test).toBe('home-hero');
  });

  it('coerces an unregistered variant to control rather than creating a phantom arm', async () => {
    await postEvent({ variant: 'z', event: 'view', sessionId: 's_bogus' });
    const row = await ABTestEvent.findOne({ sessionId: 's_bogus' })
      .lean<{ variant?: string } | null>();
    expect(row?.variant).toBe('control');
  });

  it('rejects an unknown event name', async () => {
    const res = await postEvent({ variant: 'a', event: 'purchase', sessionId: 's_bad' });
    expect(res.status).toBe(400);
    expect(await ABTestEvent.countDocuments({})).toBe(0);
  });

  it('rejects an event with no session id', async () => {
    const res = await postEvent({ variant: 'a', event: 'view' });
    expect(res.status).toBe(400);
    expect(await ABTestEvent.countDocuments({})).toBe(0);
  });

  it('writes nothing while the test is switched off', async () => {
    process.env.HOMEPAGE_AB_TEST_ENABLED = 'false';
    const res = await postEvent({ variant: 'a', event: 'view', sessionId: 's_off' });
    expect(res.status).toBe(202);
    expect(await ABTestEvent.countDocuments({})).toBe(0);
  });
});

describe('GET returns what the dashboard reads', () => {
  beforeEach(async () => {
    // Control: 4 views, 1 sign-up, 1 generate.
    // Variant A: 4 views, 2 sign-ups, 1 study, 1 sign-in, 1 dashboard.
    const seed: Array<[string, string, string]> = [
      ['control', 'view', 's1'],
      ['control', 'view', 's2'],
      ['control', 'view', 's3'],
      ['control', 'view', 's4'],
      ['control', 'signup_click', 's1'],
      ['control', 'generate_click', 's2'],
      ['a', 'view', 's5'],
      ['a', 'view', 's6'],
      ['a', 'view', 's7'],
      ['a', 'view', 's8'],
      ['a', 'signup_click', 's5'],
      ['a', 'signup_click', 's6'],
      ['a', 'study_click', 's7'],
      ['a', 'signin_click', 's8'],
      ['a', 'dashboard_click', 's8'],
    ];
    for (const [variant, event, sessionId] of seed) {
      await postEvent({ test: 'home-hero', variant, event, sessionId });
    }
    mockSession = { user: { id: '64d000000000000000000001', role: 'Admin' } };
  });

  it('refuses a non-admin', async () => {
    mockSession = { user: { id: '64d000000000000000000002', role: 'Student' } };
    expect((await getResults()).status).toBe(403);

    mockSession = null;
    expect((await getResults()).status).toBe(403);
  });

  it('returns every top-level field the admin page destructures', async () => {
    const body = await (await getResults()).json();
    for (const field of DASHBOARD_TOP_LEVEL_FIELDS) {
      expect(body).toHaveProperty(field);
    }
    expect(body.test).toBe('home-hero');
    expect(typeof body.enabled).toBe('boolean');
    expect(Number.isNaN(Date.parse(body.generatedAt))).toBe(false);
  });

  it('returns one row per registered arm, control included, with every column filled', async () => {
    const body = await (await getResults()).json();
    expect(body.variants.map((v: { variant: string }) => v.variant)).toEqual([
      'control',
      'a',
      'b',
      'c',
    ]);
    for (const row of body.variants) {
      for (const field of DASHBOARD_VARIANT_FIELDS) {
        expect(row).toHaveProperty(field);
        expect(row[field]).not.toBeUndefined();
      }
    }
  });

  it('counts each recorded event into the column named after it', async () => {
    const body = await (await getResults()).json();
    const byVariant = Object.fromEntries(
      body.variants.map((v: { variant: string }) => [v.variant, v]),
    );

    expect(byVariant.control).toMatchObject({
      views: 4,
      signups: 1,
      signins: 0,
      generates: 1,
      studies: 0,
      dashboards: 0,
    });
    expect(byVariant.a).toMatchObject({
      views: 4,
      signups: 2,
      signins: 1,
      generates: 0,
      studies: 1,
      dashboards: 1,
    });
    // Arms with no traffic still appear, at zero, rather than dropping out.
    expect(byVariant.b).toMatchObject({ views: 0, signups: 0, conversionRate: 0 });
    expect(byVariant.c).toMatchObject({ views: 0, signups: 0, conversionRate: 0 });
  });

  it('derives the rates the dashboard prints', async () => {
    const body = await (await getResults()).json();
    const byVariant = Object.fromEntries(
      body.variants.map((v: { variant: string }) => [v.variant, v]),
    );

    expect(byVariant.control.conversionRate).toBeCloseTo(25, 5); // 1 of 4
    expect(byVariant.control.engagementRate).toBeCloseTo(25, 5); // 1 generate of 4
    expect(byVariant.a.conversionRate).toBeCloseTo(50, 5); // 2 of 4
    expect(byVariant.a.engagementRate).toBeCloseTo(25, 5); // 1 study of 4
    expect(body.totalViews).toBe(8);
  });

  it('keeps a second experiment out of the home-hero numbers', async () => {
    await postEvent({ test: 'other-test', variant: 'control', event: 'view', sessionId: 's9' });

    const body = await (await getResults()).json();
    expect(body.totalViews).toBe(8);

    const other = await (await getResults('other-test')).json();
    expect(other.test).toBe('other-test');
    expect(other.totalViews).toBe(1);
  });
});
