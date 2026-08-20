/**
 * @jest-environment node
 *
 * Safety property 3: the student can claim the account, and the work comes with
 * it.
 *
 *   POST /api/teacher/students/claim
 *
 * The claim is a field update on one row, never a copy between two, so the
 * check that matters is that the id is the same before and after and that every
 * row keyed on it, and on its profile, is still there and unchanged. The SM-2
 * schedule is the one to watch: it lives on StudyAnalytics keyed by profile,
 * and weeks of review intervals cannot be reconstructed if a claim resets them.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { compare } from 'bcrypt';

let mockSession: { user: { id: string; role?: string } } | null = null;
let mockRateLimitOk = true;

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () => mockSession),
}));
jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
// The real lib/auth/auth is used here, so its clientPromise has to reach the
// same in-memory database the models write to. See the sign-in suite at the
// bottom, which drives the credentials provider for real.
jest.mock('../../../lib/db/mongodb', () => ({
  __esModule: true,
  default: {
    then: (resolve: (client: unknown) => unknown) =>
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      resolve({ db: () => require('mongoose').connection.db }),
  },
}));
jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { USER: 'user', STUDY: 'study', AUTH: 'auth' },
}));
jest.mock('../../../lib/api/purgeUserAccount', () => ({
  restoreUserAccount: jest.fn(async () => ({ restored: false, restoredSetCount: 0 })),
}));
jest.mock('../../../lib/ratelimit/ratelimit', () => ({
  getRateLimiter: jest.fn(() => ({
    limit: jest.fn(async () => ({ success: mockRateLimitOk, reset: 60 })),
  })),
}));
jest.mock('../../../lib/email/mailgun', () => ({
  sendVerificationEmail: jest.fn(async () => ({ success: true })),
}));

import { authOptions } from '@/lib/auth/auth';
import { Classroom } from '@/models/Classroom';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';
import { StudySession } from '@/models/StudySession';
import { CardResult } from '@/models/CardResult';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { MANAGED_EMAIL_DOMAIN } from '@/lib/teacher/managedStudents';
import { sendVerificationEmail } from '@/lib/email/mailgun';
import { POST as addStudent } from '@/app/api/teacher/classrooms/[id]/students/route';
import { POST as claimAccount } from '@/app/api/teacher/students/claim/route';

let mongod: MongoMemoryServer;
let seq = 0;

const BASE = 'https://flashlearnai.witus.online';
const GOOD_PASSWORD = 'Cassava-Roots-91!';

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
  mockRateLimitOk = true;
  await Promise.all([
    User.deleteMany({}),
    Profile.deleteMany({}),
    Classroom.deleteMany({}),
    StudySession.deleteMany({}),
    CardResult.deleteMany({}),
    StudyAnalytics.deleteMany({}),
  ]);
});

function credentialsAuthorize(email: string, password: string) {
  const provider = (authOptions.providers as any[]).find(
    (candidate) => (candidate.options?.id ?? candidate.id) === 'credentials',
  );
  const authorize = provider.options?.authorize ?? provider.authorize;
  return authorize({ email, password }, {} as any);
}

function claimRequest(body: unknown) {
  return new NextRequest(`${BASE}/api/teacher/students/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function claim(body: Record<string, unknown>) {
  const response = await claimAccount(claimRequest(body));
  return { status: response.status, body: await response.json() };
}

/** Creates a teacher, a classroom, and one managed student through the route. */
async function seedManagedStudent(name = 'Ada Okafor') {
  seq += 1;
  const teacher = await User.create({
    name: 'Mr Adeyemi',
    email: `teacher${seq}@example.com`,
    password: 'x',
    role: 'Teacher',
  });
  const classroom = await Classroom.create({
    name: `Room ${seq}`,
    teacherId: teacher._id,
    students: [],
    joinCode: `RM${seq}${Date.now()}`.slice(0, 10).toUpperCase(),
  });

  mockSession = { user: { id: String(teacher._id), role: 'Teacher' } };
  const response = await addStudent(
    new NextRequest(`${BASE}/api/teacher/classrooms/${classroom._id}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
    { params: Promise.resolve({ id: String(classroom._id) }) },
  );
  const created = await response.json();
  mockSession = null;

  return {
    teacher,
    classroom,
    studentId: created.student.id as string,
    profileId: created.student.profileId as string,
    claimCode: created.claimCode as string,
  };
}

/** Three sessions, two card results, and a review schedule mid-flight. */
async function seedStudyHistory(studentId: string, profileId: string) {
  const setId = new Types.ObjectId();
  const cardId = new Types.ObjectId();

  const sessionIds = ['alpha', 'beta', 'gamma'].map((tag) => `${tag}-${studentId}`);
  await StudySession.insertMany(
    sessionIds.map((sessionId, index) => ({
      sessionId,
      userId: new Types.ObjectId(studentId),
      listId: setId,
      startTime: new Date(Date.now() - index * 86_400_000),
      status: 'completed',
      totalCards: 12,
      correctCount: 9 + index,
      incorrectCount: 3 - index,
      completedCards: 12,
    })),
  );

  await CardResult.insertMany([
    {
      sessionId: sessionIds[0],
      setId: String(setId),
      flashcardId: String(cardId),
      isCorrect: true,
      timeSeconds: 4,
    },
    {
      sessionId: sessionIds[1],
      setId: String(setId),
      flashcardId: String(cardId),
      isCorrect: false,
      timeSeconds: 11,
    },
  ]);

  const nextReviewDate = new Date(Date.now() + 6 * 86_400_000);
  await StudyAnalytics.create({
    profile: new Types.ObjectId(profileId),
    set: setId,
    cardPerformance: [
      {
        cardId,
        correctCount: 4,
        incorrectCount: 1,
        mlData: { easinessFactor: 2.36, interval: 6, repetitions: 3, nextReviewDate },
      },
    ],
    setPerformance: { totalStudySessions: 3, totalTimeStudied: 900, averageScore: 0.8 },
  });

  return { setId, cardId, sessionIds, nextReviewDate };
}

describe('claiming a managed account', () => {
  it('keeps every session, card result, and review schedule on the same account', async () => {
    const { studentId, profileId, claimCode } = await seedManagedStudent();
    const history = await seedStudyHistory(studentId, profileId);

    const { status, body } = await claim({
      claimCode,
      email: 'Ada.Okafor@Example.com',
      password: GOOD_PASSWORD,
      ageAttested: true,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    // The same row throughout. Nothing was copied anywhere.
    expect(body.user.id).toBe(studentId);
    expect(body.user.email).toBe('ada.okafor@example.com');
    expect(body.preserved.studySessions).toBe(3);

    const claimed = await User.findById(studentId).lean<any>();
    expect(claimed.isManaged).toBeUndefined();
    expect(claimed.managedBy).toBeUndefined();
    expect(claimed.claimCodeHash).toBeUndefined();
    expect(claimed.claimCodeExpires).toBeUndefined();
    expect(claimed.email).toBe('ada.okafor@example.com');
    expect(claimed.email.endsWith(MANAGED_EMAIL_DOMAIN)).toBe(false);
    expect(claimed.name).toBe('Ada Okafor');
    expect(claimed.ageAttested).toBe(true);
    expect(await compare(GOOD_PASSWORD, claimed.password)).toBe(true);
    // The profile is the same one, which is what keeps the schedule attached.
    expect(claimed.profiles.map(String)).toEqual([profileId]);

    const sessions = await StudySession.find({ userId: new Types.ObjectId(studentId) }).lean<any[]>();
    expect(sessions).toHaveLength(3);
    expect(sessions.map((s) => s.sessionId).sort()).toEqual([...history.sessionIds].sort());

    const results = await CardResult.find({ sessionId: { $in: history.sessionIds } }).lean<any[]>();
    expect(results).toHaveLength(2);

    const analytics = await StudyAnalytics.findOne({
      profile: new Types.ObjectId(profileId),
    }).lean<any>();
    expect(analytics).not.toBeNull();
    expect(analytics.setPerformance.totalStudySessions).toBe(3);
    const card = analytics.cardPerformance[0];
    expect(card.mlData.easinessFactor).toBeCloseTo(2.36, 5);
    expect(card.mlData.interval).toBe(6);
    expect(card.mlData.repetitions).toBe(3);
    expect(new Date(card.mlData.nextReviewDate).getTime()).toBe(history.nextReviewDate.getTime());
  });

  it('leaves the student on the roster they were claimed from', async () => {
    const { classroom, studentId, claimCode } = await seedManagedStudent();

    await claim({
      claimCode,
      email: 'ada@example.com',
      password: GOOD_PASSWORD,
      ageAttested: true,
    });

    const roster = await Classroom.findById(classroom._id).lean<any>();
    expect(roster.students.map(String)).toContain(studentId);
  });

  it('sends a verification link to the address the student gave', async () => {
    const { claimCode } = await seedManagedStudent();

    const { body } = await claim({
      claimCode,
      email: 'ada@example.com',
      password: GOOD_PASSWORD,
      ageAttested: true,
    });

    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect((sendVerificationEmail as jest.Mock).mock.calls[0][0]).toBe('ada@example.com');
    expect(body.requiresEmailVerification).toBe(true);
    expect(body.emailVerificationSent).toBe(true);
  });

  it('spends the code, so the same one cannot claim anything again', async () => {
    const { claimCode } = await seedManagedStudent();

    const first = await claim({
      claimCode,
      email: 'ada@example.com',
      password: GOOD_PASSWORD,
      ageAttested: true,
    });
    const second = await claim({
      claimCode,
      email: 'someone.else@example.com',
      password: GOOD_PASSWORD,
      ageAttested: true,
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
    const account = await User.findOne({ email: 'ada@example.com' }).lean<any>();
    expect(account).not.toBeNull();
    expect(await User.findOne({ email: 'someone.else@example.com' })).toBeNull();
  });

  it('accepts the code however it was typed', async () => {
    const { claimCode } = await seedManagedStudent();

    const { status } = await claim({
      claimCode: `  ${claimCode.replace('-', ' ').toLowerCase()}  `,
      email: 'ada@example.com',
      password: GOOD_PASSWORD,
      ageAttested: true,
    });

    expect(status).toBe(200);
  });

  it('says the same thing to a wrong code as to a spent one', async () => {
    await seedManagedStudent();

    const { status, body } = await claim({
      claimCode: 'ZZZZZ-ZZZZZ',
      email: 'ada@example.com',
      password: GOOD_PASSWORD,
      ageAttested: true,
    });

    expect(status).toBe(400);
    expect(body.error).toBe('That claim code is not valid or has already been used.');
  });

  it('refuses an expired code and says to ask for a new one', async () => {
    const { studentId, claimCode } = await seedManagedStudent();
    await User.updateOne(
      { _id: studentId },
      { $set: { claimCodeExpires: new Date(Date.now() - 1000) } },
    );

    const { status, body } = await claim({
      claimCode,
      email: 'ada@example.com',
      password: GOOD_PASSWORD,
      ageAttested: true,
    });

    expect(status).toBe(410);
    expect(body.error).toMatch(/ask your teacher/i);
    const untouched = await User.findById(studentId).lean<any>();
    expect(untouched.isManaged).toBe(true);
  });

  it('refuses an address that another account already uses', async () => {
    const { studentId, claimCode } = await seedManagedStudent();
    await User.create({ name: 'Someone', email: 'taken@example.com', password: 'x' });

    const { status } = await claim({
      claimCode,
      email: 'taken@example.com',
      password: GOOD_PASSWORD,
      ageAttested: true,
    });

    expect(status).toBe(409);
    const untouched = await User.findById(studentId).lean<any>();
    expect(untouched.isManaged).toBe(true);
    expect(untouched.password).toBeUndefined();
  });

  it('holds the password to the same rules registration uses', async () => {
    const { studentId, claimCode } = await seedManagedStudent();

    const { status, body } = await claim({
      claimCode,
      email: 'ada@example.com',
      password: 'password',
      ageAttested: true,
    });

    expect(status).toBe(400);
    expect(body.details.password).toBeDefined();
    const untouched = await User.findById(studentId).lean<any>();
    expect(untouched.isManaged).toBe(true);
    expect(untouched.password).toBeUndefined();
  });

  it('requires the age attestation', async () => {
    const { claimCode } = await seedManagedStudent();

    const { status } = await claim({
      claimCode,
      email: 'ada@example.com',
      password: GOOD_PASSWORD,
    });

    expect(status).toBe(400);
  });

  it('meters attempts so a code cannot be guessed at speed', async () => {
    await seedManagedStudent();
    mockRateLimitOk = false;

    const { status } = await claim({
      claimCode: 'ZZZZZ-ZZZZZ',
      email: 'ada@example.com',
      password: GOOD_PASSWORD,
      ageAttested: true,
    });

    expect(status).toBe(429);
  });
});

describe('signing in before and after the claim', () => {
  it('goes from refused to accepted on the same account id', async () => {
    const { studentId, claimCode } = await seedManagedStudent();
    const managedEmail = (await User.findById(studentId).lean<any>()).email;

    // Before: no password, and the managed refusal fires first anyway.
    await expect(credentialsAuthorize(managedEmail, GOOD_PASSWORD)).resolves.toBeNull();

    await claim({
      claimCode,
      email: 'ada@example.com',
      password: GOOD_PASSWORD,
      ageAttested: true,
    });

    // Straight after: the address is theirs but unverified, which is the same
    // state a fresh signup is in, and the same refusal.
    await expect(credentialsAuthorize('ada@example.com', GOOD_PASSWORD)).resolves.toBeNull();

    await User.updateOne({ _id: studentId }, { $set: { emailVerified: true } });

    const signedIn = await credentialsAuthorize('ada@example.com', GOOD_PASSWORD);
    expect(signedIn).not.toBeNull();
    expect(signedIn.id).toBe(studentId);
    expect(signedIn.name).toBe('Ada Okafor');

    // And the old synthetic address is not a way in.
    await expect(credentialsAuthorize(managedEmail, GOOD_PASSWORD)).resolves.toBeNull();
  });
});
