/**
 * @jest-environment node
 *
 * Teacher-managed student accounts.
 *
 *   GET    /api/teacher/classrooms/:id/students
 *   POST   /api/teacher/classrooms/:id/students
 *   DELETE /api/teacher/classrooms/:id/students/:studentId
 *   POST   /api/teacher/classrooms/:id/students/:studentId/claim-code
 *
 * Two of the four safety properties are checked here: a teacher can only add to
 * a classroom they teach, and a managed account never gets a password. The
 * third, that proctoring needs no change, is checked at the bottom by driving
 * the real resolver rather than by reading the code and agreeing with it.
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
jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
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
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';
import { StudySession } from '@/models/StudySession';
import { resolveStudySubject } from '@/lib/study/resolveStudySubject';
import { MANAGED_EMAIL_DOMAIN } from '@/lib/teacher/managedStudents';
import {
  GET as getRoster,
  POST as addStudent,
} from '@/app/api/teacher/classrooms/[id]/students/route';
import { DELETE as removeStudent } from '@/app/api/teacher/classrooms/[id]/students/[studentId]/route';
import { POST as mintClaimCodeRoute } from '@/app/api/teacher/classrooms/[id]/students/[studentId]/claim-code/route';

let mongod: MongoMemoryServer;
let seq = 0;

const BASE = 'https://flashlearnai.witus.online';

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
    StudySession.deleteMany({}),
  ]);
});

function signIn(user: { _id: Types.ObjectId }, role = 'Teacher') {
  currentSession = { user: { id: String(user._id), role } };
}

async function makeUser(role: string, name: string) {
  seq += 1;
  return User.create({ name, email: `person${seq}@example.com`, password: 'x', role });
}

async function makeClassroom(teacherId: Types.ObjectId, extra: Record<string, unknown> = {}) {
  seq += 1;
  return Classroom.create({
    name: `Room ${seq}`,
    teacherId,
    students: [],
    joinCode: `RM${seq}${Date.now()}`.slice(0, 10).toUpperCase(),
    ...extra,
  });
}

function postRequest(classroomId: string, body: unknown) {
  return new NextRequest(`${BASE}/api/teacher/classrooms/${classroomId}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function plainRequest(url: string, method = 'GET') {
  return new NextRequest(`${BASE}${url}`, { method });
}

const classroomParams = (id: string) => ({ params: Promise.resolve({ id }) });
const studentParams = (id: string, studentId: string) => ({
  params: Promise.resolve({ id, studentId }),
});

/** Adds a student the way the route does and returns the parsed body. */
async function addManagedStudent(classroomId: string, name: string) {
  const response = await addStudent(postRequest(classroomId, { name }), classroomParams(classroomId));
  return { status: response.status, body: await response.json() };
}

describe('POST /api/teacher/classrooms/:id/students', () => {
  it('creates a managed student, enrols them, and gives them a profile', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const classroom = await makeClassroom(teacher._id);
    signIn(teacher);

    const { status, body } = await addManagedStudent(String(classroom._id), 'Ada Okafor');

    expect(status).toBe(201);
    expect(body.student.name).toBe('Ada Okafor');
    expect(body.student.isManaged).toBe(true);
    expect(body.claimCode).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    expect(new Date(body.claimCodeExpiresAt).getTime()).toBeGreaterThan(Date.now());

    const created = await User.findById(body.student.id).lean<any>();
    expect(created.isManaged).toBe(true);
    expect(String(created.managedBy)).toBe(String(teacher._id));
    expect(created.email).toBe(`managed-${body.student.id}@${MANAGED_EMAIL_DOMAIN}`);
    expect(created.role).toBe('Student');

    const enrolled = await Classroom.findById(classroom._id).lean<any>();
    expect(enrolled.students.map(String)).toContain(body.student.id);

    const profile = await Profile.findById(body.student.profileId).lean<any>();
    expect(String(profile.user)).toBe(body.student.id);
    expect(created.profiles.map(String)).toEqual([body.student.profileId]);
  });

  it('never writes a password field', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const classroom = await makeClassroom(teacher._id);
    signIn(teacher);

    const { body } = await addManagedStudent(String(classroom._id), 'Ada Okafor');

    const raw = await User.collection.findOne({ _id: new Types.ObjectId(body.student.id) });
    expect(Object.keys(raw as object)).not.toContain('password');
    expect(Object.keys(raw as object)).not.toContain('loginCode');
  });

  it('gives every student a distinct address even when the names match', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const classroom = await makeClassroom(teacher._id);
    signIn(teacher);

    const first = await addManagedStudent(String(classroom._id), 'Alex Kim');
    const second = await addManagedStudent(String(classroom._id), 'Alex Kim');

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.student.id).not.toBe(second.body.student.id);

    const emails = await User.find({ isManaged: true }).distinct('email');
    expect(emails).toHaveLength(2);
    emails.forEach((email: string) => expect(email.endsWith(`@${MANAGED_EMAIL_DOMAIN}`)).toBe(true));
  });

  it('refuses a teacher adding to a classroom they do not teach', async () => {
    const owner = await makeUser('Teacher', 'Mr Adeyemi');
    const stranger = await makeUser('Teacher', 'Ms Duarte');
    const classroom = await makeClassroom(owner._id);
    signIn(stranger);

    const { status } = await addManagedStudent(String(classroom._id), 'Ada Okafor');

    expect(status).toBe(403);
    expect(await User.countDocuments({ isManaged: true })).toBe(0);
    const untouched = await Classroom.findById(classroom._id).lean<any>();
    expect(untouched.students).toHaveLength(0);
  });

  it('refuses a student, whatever classroom they name', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const student = await makeUser('Student', 'Ada Okafor');
    const classroom = await makeClassroom(teacher._id);
    signIn(student, 'Student');

    const { status } = await addManagedStudent(String(classroom._id), 'Someone Else');

    expect(status).toBe(403);
  });

  it('lets an admin add to another teacher classroom, owned by that teacher', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const admin = await makeUser('Admin', 'Ops');
    const classroom = await makeClassroom(teacher._id);
    signIn(admin, 'Admin');

    const { status, body } = await addManagedStudent(String(classroom._id), 'Ada Okafor');

    expect(status).toBe(201);
    const created = await User.findById(body.student.id).lean<any>();
    expect(String(created.managedBy)).toBe(String(teacher._id));
  });

  it('refuses an archived classroom with 409', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const classroom = await makeClassroom(teacher._id, { isArchived: true });
    signIn(teacher);

    const { status } = await addManagedStudent(String(classroom._id), 'Ada Okafor');

    expect(status).toBe(409);
    expect(await User.countDocuments({ isManaged: true })).toBe(0);
  });

  it('requires a name of a usable length', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const classroom = await makeClassroom(teacher._id);
    signIn(teacher);

    const empty = await addManagedStudent(String(classroom._id), '');
    const tooLong = await addManagedStudent(String(classroom._id), 'x'.repeat(81));

    expect(empty.status).toBe(400);
    expect(tooLong.status).toBe(400);
  });

  it('refuses an unauthenticated caller', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const classroom = await makeClassroom(teacher._id);

    const { status } = await addManagedStudent(String(classroom._id), 'Ada Okafor');

    expect(status).toBe(401);
  });

  it('answers 404 for a classroom that does not exist', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    signIn(teacher);

    const { status } = await addManagedStudent(String(new Types.ObjectId()), 'Ada Okafor');

    expect(status).toBe(404);
  });
});

describe('GET /api/teacher/classrooms/:id/students', () => {
  it('marks which students are managed and hides the synthetic address', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const selfSignup = await makeUser('Student', 'Nadia Okonkwo');
    const classroom = await makeClassroom(teacher._id, { students: [selfSignup._id] });
    signIn(teacher);

    const created = await addManagedStudent(String(classroom._id), 'Ada Okafor');

    const response = await getRoster(
      plainRequest(`/api/teacher/classrooms/${classroom._id}/students`),
      classroomParams(String(classroom._id)),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.classroom.name).toBe(classroom.name);
    expect(body.students).toHaveLength(2);

    const managed = body.students.find((s: any) => s.id === created.body.student.id);
    expect(managed.isManaged).toBe(true);
    expect(managed.managedByYou).toBe(true);
    expect(managed.hasClaimCode).toBe(true);
    expect(managed.claimCodeExpired).toBe(false);
    expect(managed.email).toBeNull();

    const ordinary = body.students.find((s: any) => s.id === String(selfSignup._id));
    expect(ordinary.isManaged).toBe(false);
    expect(ordinary.email).toBe(selfSignup.email);
  });

  it('refuses a teacher who does not teach the classroom', async () => {
    const owner = await makeUser('Teacher', 'Mr Adeyemi');
    const stranger = await makeUser('Teacher', 'Ms Duarte');
    const classroom = await makeClassroom(owner._id);
    signIn(stranger);

    const response = await getRoster(
      plainRequest(`/api/teacher/classrooms/${classroom._id}/students`),
      classroomParams(String(classroom._id)),
    );

    expect(response.status).toBe(403);
  });
});

describe('DELETE /api/teacher/classrooms/:id/students/:studentId', () => {
  it('takes the student off the roster and keeps the account and its work', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const classroom = await makeClassroom(teacher._id);
    signIn(teacher);

    const created = await addManagedStudent(String(classroom._id), 'Ada Okafor');
    const studentId = created.body.student.id;

    await StudySession.create({
      sessionId: `session-${Date.now()}`,
      userId: new Types.ObjectId(studentId),
      listId: new Types.ObjectId(),
      startTime: new Date(),
      status: 'completed',
      totalCards: 10,
    });

    const response = await removeStudent(
      plainRequest(`/api/teacher/classrooms/${classroom._id}/students/${studentId}`, 'DELETE'),
      studentParams(String(classroom._id), studentId),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.accountDeleted).toBe(false);
    expect(body.removed.isManaged).toBe(true);

    const roster = await Classroom.findById(classroom._id).lean<any>();
    expect(roster.students.map(String)).not.toContain(studentId);

    expect(await User.findById(studentId)).not.toBeNull();
    expect(await Profile.countDocuments({ user: new Types.ObjectId(studentId) })).toBe(1);
    expect(await StudySession.countDocuments({ userId: new Types.ObjectId(studentId) })).toBe(1);
  });

  it('answers 404 for a student who is not on the roster', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const classroom = await makeClassroom(teacher._id);
    const outsider = await makeUser('Student', 'Nadia Okonkwo');
    signIn(teacher);

    const response = await removeStudent(
      plainRequest(`/api/teacher/classrooms/${classroom._id}/students/${outsider._id}`, 'DELETE'),
      studentParams(String(classroom._id), String(outsider._id)),
    );

    expect(response.status).toBe(404);
  });

  it('refuses a teacher who does not teach the classroom', async () => {
    const owner = await makeUser('Teacher', 'Mr Adeyemi');
    const stranger = await makeUser('Teacher', 'Ms Duarte');
    const classroom = await makeClassroom(owner._id);
    signIn(owner);
    const created = await addManagedStudent(String(classroom._id), 'Ada Okafor');

    signIn(stranger);
    const response = await removeStudent(
      plainRequest(
        `/api/teacher/classrooms/${classroom._id}/students/${created.body.student.id}`,
        'DELETE',
      ),
      studentParams(String(classroom._id), created.body.student.id),
    );

    expect(response.status).toBe(403);
    const roster = await Classroom.findById(classroom._id).lean<any>();
    expect(roster.students.map(String)).toContain(created.body.student.id);
  });
});

describe('POST /api/teacher/classrooms/:id/students/:studentId/claim-code', () => {
  it('mints a different code and retires the previous one', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const classroom = await makeClassroom(teacher._id);
    signIn(teacher);

    const created = await addManagedStudent(String(classroom._id), 'Ada Okafor');
    const before = await User.findById(created.body.student.id).lean<any>();

    const response = await mintClaimCodeRoute(
      plainRequest(
        `/api/teacher/classrooms/${classroom._id}/students/${created.body.student.id}/claim-code`,
        'POST',
      ),
      studentParams(String(classroom._id), created.body.student.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.claimCode).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    expect(body.claimCode).not.toBe(created.body.claimCode);

    const after = await User.findById(created.body.student.id).lean<any>();
    expect(after.claimCodeHash).not.toBe(before.claimCodeHash);
  });

  it('refuses to mint a code for a student who already owns their account', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const selfSignup = await makeUser('Student', 'Nadia Okonkwo');
    const classroom = await makeClassroom(teacher._id, { students: [selfSignup._id] });
    signIn(teacher);

    const response = await mintClaimCodeRoute(
      plainRequest(
        `/api/teacher/classrooms/${classroom._id}/students/${selfSignup._id}/claim-code`,
        'POST',
      ),
      studentParams(String(classroom._id), String(selfSignup._id)),
    );

    expect(response.status).toBe(409);
    const untouched = await User.findById(selfSignup._id).lean<any>();
    expect(untouched.claimCodeHash).toBeUndefined();
  });

  it('refuses a teacher who does not teach the classroom', async () => {
    const owner = await makeUser('Teacher', 'Mr Adeyemi');
    const stranger = await makeUser('Teacher', 'Ms Duarte');
    const classroom = await makeClassroom(owner._id);
    signIn(owner);
    const created = await addManagedStudent(String(classroom._id), 'Ada Okafor');

    signIn(stranger);
    const response = await mintClaimCodeRoute(
      plainRequest(
        `/api/teacher/classrooms/${classroom._id}/students/${created.body.student.id}/claim-code`,
        'POST',
      ),
      studentParams(String(classroom._id), created.body.student.id),
    );

    expect(response.status).toBe(403);
  });
});

describe('proctoring a managed student', () => {
  it('works through the existing resolver with no change to it', async () => {
    // The whole design rests on this. `resolveStudySubject` authorizes through
    // classroom membership, and a managed student is enrolled in exactly the
    // same array as anyone else, so the proctoring edge is the one that was
    // already there rather than a second one built for these accounts.
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const classroom = await makeClassroom(teacher._id);
    signIn(teacher);

    const created = await addManagedStudent(String(classroom._id), 'Ada Okafor');

    const result = await resolveStudySubject(String(teacher._id), created.body.student.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(String(result.subject.userId)).toBe(created.body.student.id);
    expect(String(result.subject.proctorId)).toBe(String(teacher._id));
    expect(result.subject.isProctored).toBe(true);
    // The profile the create route made, not a second one the resolver healed
    // into existence.
    expect(String(result.subject.profileId)).toBe(created.body.student.profileId);
    expect(await Profile.countDocuments({ user: new Types.ObjectId(created.body.student.id) })).toBe(1);
  });

  it('stops working for another teacher, and after the student leaves the roster', async () => {
    const teacher = await makeUser('Teacher', 'Mr Adeyemi');
    const stranger = await makeUser('Teacher', 'Ms Duarte');
    const classroom = await makeClassroom(teacher._id);
    signIn(teacher);

    const created = await addManagedStudent(String(classroom._id), 'Ada Okafor');
    const studentId = created.body.student.id;

    const byStranger = await resolveStudySubject(String(stranger._id), studentId);
    expect(byStranger.ok).toBe(false);

    await removeStudent(
      plainRequest(`/api/teacher/classrooms/${classroom._id}/students/${studentId}`, 'DELETE'),
      studentParams(String(classroom._id), studentId),
    );

    const afterRemoval = await resolveStudySubject(String(teacher._id), studentId);
    expect(afterRemoval.ok).toBe(false);
    if (afterRemoval.ok) return;
    expect(afterRemoval.status).toBe(403);
  });
});
