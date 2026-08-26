/**
 * @jest-environment node
 *
 * GET /api/teacher/students/:studentId/analytics
 *
 * The property under test is a single sentence: whoever may proctor a student
 * may read that student's numbers, and nobody else. So the authorization cases
 * below are driven through the real route and the real resolver rather than by
 * reading the code and agreeing with it, and one case drives the study picker
 * (`/api/study/proctorable-students`) alongside the analytics route to check
 * the two answer for the same people.
 *
 * The attribution case matters just as much. `StudySession.userId` is the
 * learner and `proctorId` is the adult, so a session a teacher ran must show up
 * in the student's totals and nowhere in the teacher's.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';

let currentSession: { user: { id: string; role?: string } } | null = null;

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () => currentSession),
}));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('../../../lib/db/dbConnect', () => ({
  __esModule: true,
  default: jest.fn(async () => undefined),
}));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { USER: 'user', STUDY: 'study', AUTH: 'auth' },
}));

import { Classroom } from '@/models/Classroom';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { StudySession } from '@/models/StudySession';
import { User } from '@/models/User';
import { createManagedStudent } from '@/lib/teacher/managedStudents';
import { GET as getAnalytics } from '@/app/api/teacher/students/[studentId]/analytics/route';
import { GET as getProctorable } from '@/app/api/study/proctorable-students/route';

const BASE = 'https://flashlearnai.witus.online';
const DAY_MS = 24 * 60 * 60 * 1000;

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
  currentSession = null;
  await Promise.all([
    User.deleteMany({}),
    Profile.deleteMany({}),
    Classroom.deleteMany({}),
    FlashcardSet.deleteMany({}),
    StudySession.deleteMany({}),
    StudyAnalytics.deleteMany({}),
  ]);
});

function signIn(user: { _id: Types.ObjectId }, role = 'Teacher') {
  currentSession = { user: { id: String(user._id), role } };
}

interface Learner {
  user: any;
  profileId: Types.ObjectId;
}

async function makeUser(role: string, name: string, extra: Record<string, unknown> = {}) {
  seq += 1;
  return User.create({
    name,
    email: `person${seq}@example.com`,
    password: 'x',
    role,
    ...extra,
  });
}

async function makeLearner(name: string, role = 'Student'): Promise<Learner> {
  const user = await makeUser(role, name);
  const profile = await Profile.create({ user: user._id, profileName: 'My Profile' });
  await User.updateOne({ _id: user._id }, { $push: { profiles: profile._id } });
  return { user, profileId: profile._id as Types.ObjectId };
}

async function makeClassroom(teacherId: Types.ObjectId, students: Types.ObjectId[] = []) {
  seq += 1;
  return Classroom.create({
    name: `Room ${seq}`,
    teacherId,
    students,
    joinCode: `RM${seq}${Date.now()}`.slice(0, 10).toUpperCase(),
  });
}

async function makeSet(profileId: Types.ObjectId, title: string, fronts: string[]) {
  return FlashcardSet.create({
    profile: profileId,
    title,
    cardCount: fronts.length,
    source: 'Prompt',
    flashcards: fronts.map((front, index) => ({ front, back: `Answer ${index + 1}` })),
  });
}

async function recordSession(params: {
  learnerId: Types.ObjectId;
  setId: Types.ObjectId;
  correct: number;
  incorrect: number;
  startedDaysAgo?: number;
  minutes?: number;
  proctorId?: Types.ObjectId;
}) {
  seq += 1;
  const startTime = new Date(Date.now() - (params.startedDaysAgo ?? 1) * DAY_MS);
  const endTime = new Date(startTime.getTime() + (params.minutes ?? 10) * 60 * 1000);
  return StudySession.create({
    sessionId: `session-${seq}-${Date.now()}`,
    userId: params.learnerId,
    listId: params.setId,
    startTime,
    endTime,
    status: 'completed',
    totalCards: params.correct + params.incorrect,
    completedCards: params.correct + params.incorrect,
    correctCount: params.correct,
    incorrectCount: params.incorrect,
    studyMode: 'classic',
    studyDirection: 'front-to-back',
    ...(params.proctorId ? { proctorId: params.proctorId, proctorMode: 'proctored' } : {}),
  });
}

async function recordAnalytics(params: {
  profileId: Types.ObjectId;
  set: any;
  cards: { index: number; correct: number; incorrect: number }[];
  sessions: number;
  timeStudied: number;
  averageScore: number;
}) {
  return StudyAnalytics.create({
    profile: params.profileId,
    set: params.set._id,
    cardPerformance: params.cards.map((card) => ({
      cardId: params.set.flashcards[card.index]._id,
      correctCount: card.correct,
      incorrectCount: card.incorrect,
      totalTimeStudied: 30,
      modePerformance: [
        {
          mode: 'classic',
          direction: 'front-to-back',
          correctCount: card.correct,
          incorrectCount: card.incorrect,
        },
      ],
    })),
    setPerformance: {
      totalStudySessions: params.sessions,
      totalTimeStudied: params.timeStudied,
      averageScore: params.averageScore,
    },
  });
}

function request(studentId: string) {
  return new NextRequest(`${BASE}/api/teacher/students/${studentId}/analytics`);
}

async function readAnalytics(studentId: string) {
  const response = await getAnalytics(request(studentId), {
    params: Promise.resolve({ studentId }),
  });
  return { status: response.status, body: await response.json() };
}

describe('GET /api/teacher/students/:studentId/analytics: who may read', () => {
  it('answers a teacher who shares a non-archived classroom with the student', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const student = await makeLearner('Ada Okafor');
    await makeClassroom(teacher._id, [student.user._id]);
    signIn(teacher);

    const { status, body } = await readAnalytics(String(student.user._id));

    expect(status).toBe(200);
    expect(body.student.name).toBe('Ada Okafor');
    expect(body.student.isSelf).toBe(false);
  });

  it('refuses a teacher who shares no classroom with the student', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const stranger = await makeLearner('Nadia Okonkwo');
    await makeClassroom(teacher._id, []);
    signIn(teacher);

    const { status, body } = await readAnalytics(String(stranger.user._id));

    expect(status).toBe(403);
    expect(body.totals).toBeUndefined();
  });

  it('refuses a teacher whose classroom has been archived', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const student = await makeLearner('Ada Okafor');
    const classroom = await makeClassroom(teacher._id, [student.user._id]);
    await Classroom.updateOne({ _id: classroom._id }, { isArchived: true });
    signIn(teacher);

    const { status } = await readAnalytics(String(student.user._id));

    expect(status).toBe(403);
  });

  it('answers a parent linked to the student by linkedStudentIds', async () => {
    const student = await makeLearner('Ada Okafor');
    const parent = await makeUser('Parent', 'Ms Okafor', {
      linkedStudentIds: [student.user._id],
    });
    signIn(parent, 'Parent');

    const { status, body } = await readAnalytics(String(student.user._id));

    expect(status).toBe(200);
    expect(body.student.id).toBe(String(student.user._id));
  });

  it('refuses an ordinary student asking for a classmate', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const student = await makeLearner('Ada Okafor');
    const classmate = await makeLearner('Nadia Okonkwo');
    await makeClassroom(teacher._id, [student.user._id, classmate.user._id]);
    signIn(student.user, 'Student');

    const { status } = await readAnalytics(String(classmate.user._id));

    expect(status).toBe(403);
  });

  it('lets anyone read their own numbers', async () => {
    const student = await makeLearner('Ada Okafor');
    signIn(student.user, 'Student');

    const { status, body } = await readAnalytics(String(student.user._id));

    expect(status).toBe(200);
    expect(body.student.isSelf).toBe(true);
  });

  it('refuses a caller who is not signed in', async () => {
    const student = await makeLearner('Ada Okafor');

    const { status } = await readAnalytics(String(student.user._id));

    expect(status).toBe(401);
  });

  it('refuses a student inside their deletion grace period', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const student = await makeLearner('Ada Okafor');
    await makeClassroom(teacher._id, [student.user._id]);
    await User.updateOne({ _id: student.user._id }, { deletedAt: new Date() });
    signIn(teacher);

    const { status } = await readAnalytics(String(student.user._id));

    expect(status).toBe(409);
  });

  it('answers 404 for a student who does not exist and 400 for a malformed id', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    signIn(teacher);

    const missing = await readAnalytics(String(new Types.ObjectId()));
    const malformed = await readAnalytics('not-an-id');

    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(400);
  });

  it('reads for exactly the students the study picker offers, and no others', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const inClass = await makeLearner('Ada Okafor');
    const linked = await makeLearner('Kwame Mensah');
    const stranger = await makeLearner('Nadia Okonkwo');
    await makeClassroom(teacher._id, [inClass.user._id]);
    await User.updateOne({ _id: teacher._id }, { linkedStudentIds: [linked.user._id] });
    signIn(teacher);

    const picker = await getProctorable();
    const offered = (await picker.json()).students as { id: string }[];

    expect(offered.map((row) => row.id).sort()).toEqual(
      [String(inClass.user._id), String(linked.user._id)].sort(),
    );

    for (const row of offered) {
      const { status } = await readAnalytics(row.id);
      expect(status).toBe(200);
    }

    // The picker leaves this one out, so the analytics route must refuse them.
    const refused = await readAnalytics(String(stranger.user._id));
    expect(refused.status).toBe(403);
  });
});

describe('GET /api/teacher/students/:studentId/analytics: the numbers', () => {
  it('reports accuracy, card counts, time, sessions, sets, and the cards being missed', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const student = await makeLearner('Ada Okafor');
    await makeClassroom(teacher._id, [student.user._id]);

    const set = await makeSet(student.profileId, 'Cell biology', [
      'What is mitosis?',
      'What is meiosis?',
      'What is a ribosome?',
    ]);
    await recordSession({
      learnerId: student.user._id,
      setId: set._id,
      correct: 8,
      incorrect: 2,
      startedDaysAgo: 2,
      minutes: 12,
    });
    // Outside the recent window, so it lands in the all-time totals only.
    await recordSession({
      learnerId: student.user._id,
      setId: set._id,
      correct: 4,
      incorrect: 6,
      startedDaysAgo: 60,
      minutes: 8,
    });
    await recordAnalytics({
      profileId: student.profileId,
      set,
      cards: [
        { index: 0, correct: 1, incorrect: 4 },
        { index: 1, correct: 8, incorrect: 1 },
        { index: 2, correct: 3, incorrect: 0 },
      ],
      sessions: 2,
      timeStudied: 1200,
      averageScore: 70,
    });

    signIn(teacher);
    const { status, body } = await readAnalytics(String(student.user._id));

    expect(status).toBe(200);
    expect(body.hasStudied).toBe(true);

    expect(body.totals.sessions).toBe(2);
    expect(body.totals.correct).toBe(12);
    expect(body.totals.incorrect).toBe(8);
    expect(body.totals.accuracy).toBe(60);
    expect(body.totals.timeStudiedSeconds).toBe(1200);
    expect(body.totals.averageSessionScore).toBe(70);

    expect(body.recent.windowDays).toBe(30);
    expect(body.recent.sessions).toBe(1);
    expect(body.recent.accuracy).toBe(80);
    expect(body.recent.timeStudiedSeconds).toBe(12 * 60);

    expect(body.sessions).toHaveLength(2);
    expect(body.sessions[0].setName).toBe('Cell biology');
    expect(body.sessions[0].accuracy).toBe(80);
    expect(body.sessions[0].durationSeconds).toBe(12 * 60);
    expect(body.sessions[0].proctored).toBe(false);

    expect(body.sets).toHaveLength(1);
    expect(body.sets[0]).toMatchObject({
      setName: 'Cell biology',
      sessions: 2,
      correct: 12,
      incorrect: 5,
      cardsTracked: 3,
    });

    // Only the two cards with a wrong answer, worst first, with the card text
    // so the teacher knows what to go over.
    expect(body.problemCards).toHaveLength(2);
    expect(body.problemCards[0]).toMatchObject({
      front: 'What is mitosis?',
      setName: 'Cell biology',
      correct: 1,
      incorrect: 4,
      accuracy: 20,
    });
    expect(body.problemCards[0].weakestMode).toMatchObject({
      mode: 'classic',
      direction: 'front-to-back',
    });
    expect(body.problemCards[1].front).toBe('What is meiosis?');
  });

  it('counts a proctored session toward the student and never toward the proctor', async () => {
    const teacher = await makeLearner('Mr Adeyemi', 'Teacher');
    const student = await makeLearner('Ada Okafor');
    await makeClassroom(teacher.user._id, [student.user._id]);

    const set = await makeSet(student.profileId, 'Times tables', ['7 x 8', '6 x 9']);
    await recordSession({
      learnerId: student.user._id,
      setId: set._id,
      correct: 5,
      incorrect: 1,
      proctorId: teacher.user._id,
    });
    await recordAnalytics({
      profileId: student.profileId,
      set,
      cards: [{ index: 0, correct: 5, incorrect: 1 }],
      sessions: 1,
      timeStudied: 300,
      averageScore: 83,
    });

    signIn(teacher.user);
    const studentReport = await readAnalytics(String(student.user._id));
    const teacherReport = await readAnalytics(String(teacher.user._id));

    expect(studentReport.body.totals.sessions).toBe(1);
    expect(studentReport.body.totals.correct).toBe(5);
    expect(studentReport.body.totals.incorrect).toBe(1);
    expect(studentReport.body.sessions[0].proctored).toBe(true);

    // The teacher held the device. None of it is theirs.
    expect(teacherReport.body.hasStudied).toBe(false);
    expect(teacherReport.body.totals.sessions).toBe(0);
    expect(teacherReport.body.totals.accuracy).toBeNull();
    expect(teacherReport.body.sessions).toHaveLength(0);
  });

  it('says a student has not studied rather than reporting zero percent', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const student = await makeLearner('Ada Okafor');
    await makeClassroom(teacher._id, [student.user._id]);
    signIn(teacher);

    const { status, body } = await readAnalytics(String(student.user._id));

    expect(status).toBe(200);
    expect(body.hasStudied).toBe(false);
    // Zero percent accuracy and "nothing recorded" are different statements.
    expect(body.totals.accuracy).toBeNull();
    expect(body.recent.accuracy).toBeNull();
    expect(body.totals.averageSessionScore).toBeNull();
    expect(body.totals.sessions).toBe(0);
    expect(body.totals.correct).toBe(0);
    expect(body.totals.timeStudiedSeconds).toBe(0);
    expect(body.sessions).toEqual([]);
    expect(body.sets).toEqual([]);
    expect(body.problemCards).toEqual([]);
  });

  it('reads a teacher-made student who has never signed in, and hides their synthetic address', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const classroom = await makeClassroom(teacher._id);
    const managed = await createManagedStudent({
      name: 'Ada Okafor',
      teacherId: teacher._id,
      classroomId: classroom._id,
    });

    const set = await makeSet(managed.profileId, 'Sight words', ['because', 'through']);
    await recordSession({
      learnerId: managed.userId,
      setId: set._id,
      correct: 3,
      incorrect: 1,
      proctorId: teacher._id,
    });
    await recordAnalytics({
      profileId: managed.profileId,
      set,
      cards: [{ index: 1, correct: 1, incorrect: 3 }],
      sessions: 1,
      timeStudied: 240,
      averageScore: 75,
    });

    signIn(teacher);
    const { status, body } = await readAnalytics(String(managed.userId));

    expect(status).toBe(200);
    expect(body.student.name).toBe('Ada Okafor');
    expect(body.student.isManaged).toBe(true);
    expect(body.hasStudied).toBe(true);
    expect(body.totals.correct).toBe(3);
    expect(body.problemCards[0].front).toBe('through');

    // The address is synthetic, cannot receive mail, and must never reach a page.
    expect(JSON.stringify(body)).not.toContain('.invalid');
    expect(JSON.stringify(body)).not.toContain('@');
  });

  it('names a deleted set instead of dropping the row', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const student = await makeLearner('Ada Okafor');
    await makeClassroom(teacher._id, [student.user._id]);

    const goneSetId = new Types.ObjectId();
    await recordSession({
      learnerId: student.user._id,
      setId: goneSetId,
      correct: 2,
      incorrect: 2,
    });

    signIn(teacher);
    const { body } = await readAnalytics(String(student.user._id));

    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].setName).toBe('A set that has since been deleted');
    expect(body.sessions[0].accuracy).toBe(50);
  });
});
