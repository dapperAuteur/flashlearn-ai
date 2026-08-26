/**
 * @jest-environment node
 *
 * Admin management of User.linkedStudentIds.
 *
 *   GET    /api/admin/users/:id/linked-students
 *   POST   /api/admin/users/:id/linked-students
 *   DELETE /api/admin/users/:id/linked-students
 *
 * The property under test is not "the array changed". It is "the guardian can
 * now proctor that learner, and stops being able to when the link goes". So the
 * access cases run the real `resolveStudySubject` after the route has written,
 * the same function the study writes and the analytics read authorize on. An
 * assertion on the array alone would still pass if the resolver were reading a
 * different field.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { SYSTEM: 'system', USER: 'user', STUDY: 'study' },
}));

let mockToken: { id?: string; role?: string } | null = null;
jest.mock('next-auth/jwt', () => ({
  getToken: async () => mockToken,
}));

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';

import { Classroom } from '@/models/Classroom';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';
import { createManagedStudent, MANAGED_EMAIL_DOMAIN } from '@/lib/teacher/managedStudents';
import { resolveStudySubject } from '@/lib/study/resolveStudySubject';
import {
  GET as listLinked,
  POST as linkStudent,
  DELETE as unlinkStudent,
} from '@/app/api/admin/users/[id]/linked-students/route';

const BASE = 'https://flashlearnai.witus.online';
const ADMIN_ID = '64d000000000000000000001';

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
  mockToken = null;
  await Promise.all([
    User.deleteMany({}),
    Profile.deleteMany({}),
    Classroom.deleteMany({}),
  ]);
});

function signInAdmin() {
  mockToken = { id: ADMIN_ID, role: 'Admin' };
}

function signIn(role: string) {
  mockToken = { id: '64d0000000000000000000aa', role };
}

async function makeUser(role: string, name: string, extra: Record<string, unknown> = {}) {
  seq += 1;
  const user = await User.create({
    name,
    email: `person${seq}@example.com`,
    password: 'x',
    role,
    ...extra,
  });
  const profile = await Profile.create({ user: user._id, profileName: 'My Profile' });
  await User.updateOne({ _id: user._id }, { $push: { profiles: profile._id } });
  return user;
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function listRequest(id: string) {
  return new NextRequest(`${BASE}/api/admin/users/${id}/linked-students`);
}

function writeRequest(id: string, method: 'POST' | 'DELETE', body: unknown) {
  return new NextRequest(`${BASE}/api/admin/users/${id}/linked-students`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function link(guardianId: string, studentId: string) {
  return linkStudent(writeRequest(guardianId, 'POST', { studentId }), routeParams(guardianId));
}

async function unlink(guardianId: string, studentId: string) {
  return unlinkStudent(writeRequest(guardianId, 'DELETE', { studentId }), routeParams(guardianId));
}

/** The question every access case is really asking. */
async function canProctor(guardianId: Types.ObjectId, studentId: Types.ObjectId) {
  const result = await resolveStudySubject(String(guardianId), String(studentId));
  return result.ok;
}

describe('POST /api/admin/users/:id/linked-students', () => {
  it('links a student, and the guardian then resolves as their proctor', async () => {
    signInAdmin();
    const parent = await makeUser('Parent', 'Pat Parent');
    const student = await makeUser('Student', 'Sam Student');

    expect(await canProctor(parent._id, student._id)).toBe(false);

    const response = await link(String(parent._id), String(student._id));
    expect(response.status).toBe(200);

    const body = await response.json();
    // Names, not ids, so the screen has something to show.
    expect(body.students).toEqual([
      expect.objectContaining({ id: String(student._id), name: 'Sam Student' }),
    ]);

    const resolved = await resolveStudySubject(String(parent._id), String(student._id));
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    // The learner owns the result; the parent is recorded as the proctor.
    expect(String(resolved.subject.userId)).toBe(String(student._id));
    expect(String(resolved.subject.proctorId)).toBe(String(parent._id));
    expect(resolved.subject.isProctored).toBe(true);
  });

  it('is idempotent: linking twice leaves one entry, not two', async () => {
    signInAdmin();
    const tutor = await makeUser('Tutor', 'Tam Tutor');
    const student = await makeUser('Student', 'Sam Student');

    await link(String(tutor._id), String(student._id));
    const second = await link(String(tutor._id), String(student._id));

    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body.students).toHaveLength(1);

    const stored = await User.findById(tutor._id)
      .select('linkedStudentIds')
      .lean<{ linkedStudentIds: Types.ObjectId[] } | null>();
    expect(stored?.linkedStudentIds).toHaveLength(1);
  });

  it('links a teacher-managed student, who resolves to their own profile', async () => {
    signInAdmin();
    const teacher = await makeUser('Teacher', 'Tay Teacher');
    const classroom = await Classroom.create({
      name: 'Period 3',
      teacherId: teacher._id,
      students: [],
      joinCode: 'MANAGED01',
    });
    const managed = await createManagedStudent({
      name: 'Mo Managed',
      teacherId: teacher._id as Types.ObjectId,
      classroomId: classroom._id as Types.ObjectId,
    });
    const parent = await makeUser('Parent', 'Pat Parent');

    const response = await link(String(parent._id), String(managed.userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.students[0]).toMatchObject({ name: 'Mo Managed', isManaged: true, email: null });
    // The synthetic address is an implementation detail of the managed account.
    expect(JSON.stringify(body)).not.toContain(MANAGED_EMAIL_DOMAIN);

    const resolved = await resolveStudySubject(String(parent._id), String(managed.userId));
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(String(resolved.subject.profileId)).toBe(String(managed.profileId));
    expect(resolved.subject.isProctored).toBe(true);
  });

  it('refuses a caller who is not an admin', async () => {
    const parent = await makeUser('Parent', 'Pat Parent');
    const student = await makeUser('Student', 'Sam Student');

    for (const role of ['Student', 'Teacher', 'SchoolAdmin']) {
      signIn(role);
      const response = await link(String(parent._id), String(student._id));
      expect(response.status).toBe(403);
    }

    expect(await canProctor(parent._id, student._id)).toBe(false);
  });

  it('refuses a caller with no session at all', async () => {
    mockToken = null;
    const parent = await makeUser('Parent', 'Pat Parent');
    const student = await makeUser('Student', 'Sam Student');

    const response = await link(String(parent._id), String(student._id));
    expect(response.status).toBe(403);
  });

  it('refuses linking an account to itself', async () => {
    signInAdmin();
    const parent = await makeUser('Parent', 'Pat Parent');

    const response = await link(String(parent._id), String(parent._id));

    expect(response.status).toBe(400);
    const stored = await User.findById(parent._id)
      .select('linkedStudentIds')
      .lean<{ linkedStudentIds: Types.ObjectId[] } | null>();
    expect(stored?.linkedStudentIds ?? []).toHaveLength(0);
  });

  it('refuses a guardian whose role cannot proctor', async () => {
    signInAdmin();
    const classmate = await makeUser('Student', 'Chris Classmate');
    const student = await makeUser('Student', 'Sam Student');

    const response = await link(String(classmate._id), String(student._id));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Teacher, Tutor, Parent/);
    expect(await canProctor(classmate._id, student._id)).toBe(false);
  });

  it('refuses a student inside their deletion grace period', async () => {
    signInAdmin();
    const parent = await makeUser('Parent', 'Pat Parent');
    const student = await makeUser('Student', 'Sam Student', { deletedAt: new Date() });

    const response = await link(String(parent._id), String(student._id));

    expect(response.status).toBe(409);
    const stored = await User.findById(parent._id)
      .select('linkedStudentIds')
      .lean<{ linkedStudentIds: Types.ObjectId[] } | null>();
    expect(stored?.linkedStudentIds ?? []).toHaveLength(0);
  });

  it('refuses a student who does not exist, and a malformed id', async () => {
    signInAdmin();
    const parent = await makeUser('Parent', 'Pat Parent');

    const missing = await link(String(parent._id), String(new Types.ObjectId()));
    expect(missing.status).toBe(404);

    const malformed = await link(String(parent._id), 'nope');
    expect(malformed.status).toBe(400);
  });

  it('refuses a guardian who does not exist', async () => {
    signInAdmin();
    const student = await makeUser('Student', 'Sam Student');

    const response = await link(String(new Types.ObjectId()), String(student._id));

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/admin/users/:id/linked-students', () => {
  it('revokes the access the link granted', async () => {
    signInAdmin();
    const parent = await makeUser('Parent', 'Pat Parent');
    const student = await makeUser('Student', 'Sam Student');

    await link(String(parent._id), String(student._id));
    expect(await canProctor(parent._id, student._id)).toBe(true);

    const response = await unlink(String(parent._id), String(student._id));
    expect(response.status).toBe(200);
    expect((await response.json()).students).toHaveLength(0);

    expect(await canProctor(parent._id, student._id)).toBe(false);
  });

  it('leaves a link that a classroom also grants working', async () => {
    signInAdmin();
    const teacher = await makeUser('Teacher', 'Tay Teacher');
    const student = await makeUser('Student', 'Sam Student');
    await Classroom.create({
      name: 'Period 3',
      teacherId: teacher._id,
      students: [student._id],
      joinCode: 'ROOM00001',
    });

    await link(String(teacher._id), String(student._id));
    await unlink(String(teacher._id), String(student._id));

    // Unlinking removed one edge, not the teacher's classroom edge.
    expect(await canProctor(teacher._id, student._id)).toBe(true);
  });

  it('refuses a caller who is not an admin', async () => {
    const parent = await makeUser('Parent', 'Pat Parent');
    const student = await makeUser('Student', 'Sam Student');
    signInAdmin();
    await link(String(parent._id), String(student._id));

    signIn('Parent');
    const response = await unlink(String(parent._id), String(student._id));

    expect(response.status).toBe(403);
    expect(await canProctor(parent._id, student._id)).toBe(true);
  });

  it('reports a link that was never there rather than claiming success', async () => {
    signInAdmin();
    const parent = await makeUser('Parent', 'Pat Parent');
    const student = await makeUser('Student', 'Sam Student');

    const response = await unlink(String(parent._id), String(student._id));

    expect(response.status).toBe(404);
  });
});

describe('GET /api/admin/users/:id/linked-students', () => {
  it('lists linked students by name and flags a role that cannot proctor', async () => {
    signInAdmin();
    const parent = await makeUser('Parent', 'Pat Parent');
    const zoe = await makeUser('Student', 'Zoe Zebra');
    const abe = await makeUser('Student', 'Abe Anteater');

    await link(String(parent._id), String(zoe._id));
    await link(String(parent._id), String(abe._id));

    const response = await listLinked(listRequest(String(parent._id)), routeParams(String(parent._id)));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.guardian).toMatchObject({ name: 'Pat Parent', role: 'Parent', canProctor: true });
    expect(body.students.map((s: { name: string }) => s.name)).toEqual([
      'Abe Anteater',
      'Zoe Zebra',
    ]);
  });

  it('still lists stale links after the account is demoted, so they can be cleared', async () => {
    signInAdmin();
    const parent = await makeUser('Parent', 'Pat Parent');
    const student = await makeUser('Student', 'Sam Student');
    await link(String(parent._id), String(student._id));

    await User.updateOne({ _id: parent._id }, { $set: { role: 'Student' } });

    const response = await listLinked(listRequest(String(parent._id)), routeParams(String(parent._id)));
    const body = await response.json();

    expect(body.guardian.canProctor).toBe(false);
    expect(body.students).toHaveLength(1);
    // The role check in the resolver already refuses this, link or no link.
    expect(await canProctor(parent._id, student._id)).toBe(false);
  });

  it('marks a linked student who is on their way out', async () => {
    signInAdmin();
    const parent = await makeUser('Parent', 'Pat Parent');
    const student = await makeUser('Student', 'Sam Student');
    await link(String(parent._id), String(student._id));
    await User.updateOne({ _id: student._id }, { $set: { deletedAt: new Date() } });

    const response = await listLinked(listRequest(String(parent._id)), routeParams(String(parent._id)));
    const body = await response.json();

    expect(body.students[0]).toMatchObject({ pendingDeletion: true });
  });

  it('refuses a caller who is not an admin', async () => {
    signIn('Parent');
    const parent = await makeUser('Parent', 'Pat Parent');

    const response = await listLinked(listRequest(String(parent._id)), routeParams(String(parent._id)));

    expect(response.status).toBe(403);
  });
});
