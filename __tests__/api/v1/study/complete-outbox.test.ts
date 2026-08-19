/**
 * @jest-environment node
 *
 * Trigger 4a on POST /api/v1/study/sessions/[id]/complete, the partner-facing
 * twin of the internal completion route. The rule carried over from the
 * internal route is the proctored one: the caption is first person, so a
 * session an adult sat on a learner's behalf drafts nothing. The other silent
 * cases are the ones where the route rejects the request, which must return
 * before the trigger rather than after it.
 *
 * withApiAuth is stubbed to a pass-through and fireOutboxDrafts is mocked, so
 * nothing here authenticates against Mongo or reaches the Outbox.
 */

jest.mock('../../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../../lib/outbox-trigger', () => ({ fireOutboxDrafts: jest.fn() }));

const KEY_OWNER_ID = '64d000000000000000000001';
const OTHER_USER_ID = '64d000000000000000000002';
const PROCTOR_ID = '64d000000000000000000003';

jest.mock('../../../../lib/api/withApiAuth', () => {
  const { apiSuccess, apiError, generateRequestId } = jest.requireActual('../../../../lib/api/apiResponse');
  const { Types } = jest.requireActual('mongoose');
  return {
    apiSuccess,
    apiError,
    generateRequestId,
    withApiAuth: (handler: (...args: unknown[]) => Promise<unknown>) => {
      return async (req: unknown) => {
        const ctx = {
          user: { _id: new Types.ObjectId(KEY_OWNER_ID) },
          apiKey: {
            _id: new Types.ObjectId('64a000000000000000000009'),
            userId: new Types.ObjectId(KEY_OWNER_ID),
            permissions: ['*'],
          },
          keyType: 'public',
          apiTier: 'Free',
        };
        return handler(req, ctx, 'req-test');
      };
    },
  };
});

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { StudySession } from '@/models/StudySession';
import { CardResult } from '@/models/CardResult';
import { fireOutboxDrafts } from '@/lib/outbox-trigger';
import { POST as completeSession } from '@/app/api/v1/study/sessions/[id]/complete/route';

const mockedFire = fireOutboxDrafts as jest.MockedFunction<typeof fireOutboxDrafts>;

let mongod: MongoMemoryServer;
let seq = 0;

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
  await Promise.all([StudySession.deleteMany({}), CardResult.deleteMany({})]);
});

async function seedSession(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return StudySession.create({
    sessionId: `sess-${seq}`,
    userId: new Types.ObjectId(KEY_OWNER_ID),
    listId: new Types.ObjectId(),
    setName: 'Cell Biology',
    startTime: new Date(Date.now() - 6 * 60_000),
    status: 'active',
    totalCards: 2,
    ...overrides,
  });
}

function completeRequest(sessionDocId: string, body: unknown) {
  return new NextRequest(
    `https://flashlearnai.witus.online/api/v1/study/sessions/${sessionDocId}/complete`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    },
  );
}

const twoResults = {
  results: [
    { cardId: new Types.ObjectId().toString(), isCorrect: true, timeSeconds: 4 },
    { cardId: new Types.ObjectId().toString(), isCorrect: false, timeSeconds: 6 },
  ],
};

describe('POST /api/v1/study/sessions/[id]/complete: a completion drafts a post', () => {
  it('fires once with the learner id and the shared session external_ref', async () => {
    const session = await seedSession();

    const res = await completeSession(completeRequest(String(session._id), twoResults));

    expect(res.status).toBe(200);
    expect(mockedFire).toHaveBeenCalledTimes(1);
    const arg = mockedFire.mock.calls[0][0];
    // The session is looked up by the key owner's id, so learner and key owner
    // are the same account and that is what the outbox gate reads.
    expect(arg.triggerUserId).toBe(KEY_OWNER_ID);
    // Same key the internal completion route uses, so one session cannot draft
    // through both doors.
    expect(arg.externalRefBase).toBe(`study-session-${session.sessionId}`);
    expect(arg.caption).toContain('2 cards');
    expect(arg.caption).toContain('Cell Biology');
    expect(arg.caption).toContain('50% recall');
  });

  it('names the set generically when the session recorded no set title', async () => {
    const session = await seedSession({ setName: undefined });

    await completeSession(completeRequest(String(session._id), twoResults));

    expect(mockedFire.mock.calls[0][0].caption).toContain('a study set');
  });
});

describe('POST /api/v1/study/sessions/[id]/complete: everything that must NOT draft', () => {
  it('does not fire for a proctored session, because the student did the work', async () => {
    const session = await seedSession({
      proctorId: new Types.ObjectId(PROCTOR_ID),
      proctorMode: 'proctored',
    });

    const res = await completeSession(completeRequest(String(session._id), twoResults));

    expect(res.status).toBe(200);
    expect((await StudySession.findById(session._id))!.status).toBe('completed');
    expect(mockedFire).not.toHaveBeenCalled();
  });

  it('does not fire when the session is already completed', async () => {
    const session = await seedSession({ status: 'completed' });

    const res = await completeSession(completeRequest(String(session._id), twoResults));

    expect(res.status).toBe(400);
    expect(mockedFire).not.toHaveBeenCalled();
  });

  it('does not fire when the session belongs to a different account', async () => {
    const session = await seedSession({ userId: new Types.ObjectId(OTHER_USER_ID) });

    const res = await completeSession(completeRequest(String(session._id), twoResults));

    expect(res.status).toBe(404);
    expect(mockedFire).not.toHaveBeenCalled();
  });

  it('does not fire when the body carries no results', async () => {
    const session = await seedSession();

    const res = await completeSession(completeRequest(String(session._id), { results: [] }));

    expect(res.status).toBe(400);
    expect((await StudySession.findById(session._id))!.status).toBe('active');
    expect(mockedFire).not.toHaveBeenCalled();
  });

  it('does not fire when the body is not valid JSON', async () => {
    const session = await seedSession();
    const request = new NextRequest(
      `https://flashlearnai.witus.online/api/v1/study/sessions/${String(session._id)}/complete`,
      { method: 'POST', body: 'not json', headers: { 'content-type': 'application/json' } },
    );

    const res = await completeSession(request);

    expect(res.status).toBe(400);
    expect(mockedFire).not.toHaveBeenCalled();
  });
});
