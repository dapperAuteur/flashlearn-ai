/**
 * @jest-environment node
 *
 * Who gets into /teacher.
 *
 * A parent reaches a learner through User.linkedStudentIds rather than through
 * a classroom, so they were locked out of the whole area, progress pages
 * included. Letting them in wholesale would have handed them classroom and
 * assignment creation, which is not theirs. The rule is a split: progress
 * pages admit a parent, the rest of the area does not.
 *
 * This only decides who may ask. Which students a given adult may see is
 * decided per request by resolveStudySubject, against the same classroom and
 * link edges that govern proctoring, and is covered by the API suite.
 */

const mockToken: { role?: string } | null = { role: 'Student' };
let currentToken: { role?: string } | null = mockToken;

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

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret';
let middleware: (request: NextRequest) => Promise<NextResponse | Response>;

beforeAll(async () => {
  ({ middleware } = await import('@/middleware'));
});

const PROGRESS = '/teacher/students/64d000000000000000000001/analytics';
const CLASSROOMS = '/teacher/classrooms';

async function visit(path: string, role?: string) {
  currentToken = role ? { role } : null;
  const res = (await middleware(new NextRequest(`http://localhost${path}`))) as NextResponse;
  return {
    status: res.status,
    location: res.headers.get('location'),
  };
}

const isAllowed = (r: { status: number; location: string | null }) =>
  !(r.status === 307 || r.status === 302) || !r.location?.includes('/dashboard');

describe('the teaching area proper', () => {
  it.each(['Teacher', 'Tutor', 'SchoolAdmin', 'Admin'])('admits a %s', async (role) => {
    expect(isAllowed(await visit(CLASSROOMS, role))).toBe(true);
  });

  it('turns a Parent away, because classrooms are not theirs to run', async () => {
    const res = await visit(CLASSROOMS, 'Parent');
    expect(res.location).toContain('/dashboard');
  });

  it('turns a Student away', async () => {
    expect((await visit(CLASSROOMS, 'Student')).location).toContain('/dashboard');
  });
});

describe('a student progress page', () => {
  it.each(['Teacher', 'Tutor', 'SchoolAdmin', 'Admin', 'Parent'])(
    'admits a %s',
    async (role) => {
      expect(isAllowed(await visit(PROGRESS, role))).toBe(true);
    },
  );

  it('still turns a Student away, so nobody reads a classmate this way', async () => {
    expect((await visit(PROGRESS, 'Student')).location).toContain('/dashboard');
  });

  it('turns away somebody with no session at all', async () => {
    expect((await visit(PROGRESS, undefined)).location).toBeTruthy();
  });
});
