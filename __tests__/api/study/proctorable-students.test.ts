/**
 * @jest-environment node
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { resolveStudySubject } from '@/lib/study/resolveStudySubject';
import { Classroom } from '@/models/Classroom';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';

let mongod: MongoMemoryServer;
let currentUserId: string | null = null;

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () =>
    currentUserId ? { user: { id: currentUserId } } : null,
  ),
}));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
// Both of these run code at import time that demands MONGODB_URI, which this
// suite supplies through mongodb-memory-server instead. Same stubs the other
// route tests in this repo use.
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { STUDY: 'study' },
}));

import { GET } from '@/app/api/study/proctorable-students/route';

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  currentUserId = null;
  await Promise.all([User.deleteMany({}), Profile.deleteMany({}), Classroom.deleteMany({})]);
});

let seq = 0;

async function makeUser(role: string, name: string, extra: Record<string, unknown> = {}) {
  seq += 1;
  const user = await User.create({
    name,
    email: `p${seq}@example.com`,
    password: 'x',
    role,
    ...extra,
  });
  const profile = await Profile.create({ user: user._id, profileName: 'My Profile' });
  await User.findByIdAndUpdate(user._id, { $push: { profiles: profile._id } });
  return user;
}

async function makeClassroom(
  teacherId: Types.ObjectId,
  students: Types.ObjectId[],
  extra: Record<string, unknown> = {},
) {
  seq += 1;
  return Classroom.create({
    name: `Room ${seq}`,
    teacherId,
    students,
    joinCode: `RM${seq}${Date.now()}`.slice(0, 10).toUpperCase(),
    ...extra,
  });
}

async function listFor(userId: string) {
  currentUserId = userId;
  const res = await GET();
  return { status: res.status, body: await res.json() };
}

describe('GET /api/study/proctorable-students', () => {
  it('rejects an unauthenticated caller', async () => {
    currentUserId = null;
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('lists the students of a classroom the caller teaches', async () => {
    const teacher = await makeUser('Teacher', 'Ms Diaz');
    const student = await makeUser('Student', 'Alex Rivera');
    await makeClassroom(teacher._id, [student._id]);

    const { status, body } = await listFor(String(teacher._id));

    expect(status).toBe(200);
    expect(body.students).toHaveLength(1);
    expect(body.students[0]).toMatchObject({ id: String(student._id), name: 'Alex Rivera' });
    expect(body.students[0].classrooms).toHaveLength(1);
  });

  it('never leaks an email address', async () => {
    const teacher = await makeUser('Teacher', 'Ms Diaz');
    const student = await makeUser('Student', 'Alex Rivera');
    await makeClassroom(teacher._id, [student._id]);

    const { body } = await listFor(String(teacher._id));

    expect(JSON.stringify(body)).not.toContain('@example.com');
  });

  it('omits students from another teacher’s classroom', async () => {
    const teacher = await makeUser('Teacher', 'Ms Diaz');
    const otherTeacher = await makeUser('Teacher', 'Mr Oyelaran');
    const stranger = await makeUser('Student', 'Not Mine');
    await makeClassroom(otherTeacher._id, [stranger._id]);
    await makeClassroom(teacher._id, []);

    const { body } = await listFor(String(teacher._id));

    expect(body.students).toHaveLength(0);
  });

  it('contributes nobody from an archived classroom', async () => {
    const teacher = await makeUser('Teacher', 'Ms Diaz');
    const student = await makeUser('Student', 'Alex Rivera');
    await makeClassroom(teacher._id, [student._id], { isArchived: true });

    const { body } = await listFor(String(teacher._id));

    expect(body.students).toHaveLength(0);
  });

  it('includes a student reached through linkedStudentIds', async () => {
    const student = await makeUser('Student', 'Linked Learner');
    const tutor = await makeUser('Tutor', 'Tutor Tam', { linkedStudentIds: [student._id] });

    const { body } = await listFor(String(tutor._id));

    expect(body.students).toHaveLength(1);
    expect(body.students[0]).toMatchObject({ id: String(student._id), viaLink: true });
  });

  it('excludes a student inside their deletion grace period', async () => {
    const teacher = await makeUser('Teacher', 'Ms Diaz');
    const student = await makeUser('Student', 'Leaving Soon');
    await makeClassroom(teacher._id, [student._id]);
    await User.findByIdAndUpdate(student._id, { deletedAt: new Date() });

    const { body } = await listFor(String(teacher._id));

    expect(body.students).toHaveLength(0);
  });

  it('lists a student in two of the caller’s classrooms once, naming both', async () => {
    const teacher = await makeUser('Teacher', 'Ms Diaz');
    const student = await makeUser('Student', 'Twice Enrolled');
    await makeClassroom(teacher._id, [student._id]);
    await makeClassroom(teacher._id, [student._id]);

    const { body } = await listFor(String(teacher._id));

    expect(body.students).toHaveLength(1);
    expect(body.students[0].classrooms).toHaveLength(2);
  });

  it('gives a plain student an empty list rather than a 403', async () => {
    const teacher = await makeUser('Teacher', 'Ms Diaz');
    const student = await makeUser('Student', 'Alex Rivera');
    const classmate = await makeUser('Student', 'Sam Cole');
    await makeClassroom(teacher._id, [student._id, classmate._id]);

    const { status, body } = await listFor(String(student._id));

    // Loading the study screen is not an offence. There is simply nobody to
    // record for, so an empty list is the honest answer.
    expect(status).toBe(200);
    expect(body.students).toHaveLength(0);
  });

  it('sorts by name so a long roster can be scanned', async () => {
    const teacher = await makeUser('Teacher', 'Ms Diaz');
    const zoe = await makeUser('Student', 'Zoe Adeyemi');
    const abe = await makeUser('Student', 'Abe Nowak');
    await makeClassroom(teacher._id, [zoe._id, abe._id]);

    const { body } = await listFor(String(teacher._id));

    expect(body.students.map((s: { name: string }) => s.name)).toEqual([
      'Abe Nowak',
      'Zoe Adeyemi',
    ]);
  });
});

describe('the picker and the write path agree', () => {
  // If these two ever disagree, the picker offers a student the write path then
  // refuses, and the teacher has no way to work out why.
  it('every student it lists is one the resolver accepts', async () => {
    const teacher = await makeUser('Teacher', 'Ms Diaz');
    const classroomStudent = await makeUser('Student', 'In Class');
    const linkedStudent = await makeUser('Student', 'Linked');
    await makeClassroom(teacher._id, [classroomStudent._id]);
    await User.findByIdAndUpdate(teacher._id, { linkedStudentIds: [linkedStudent._id] });

    const { body } = await listFor(String(teacher._id));
    expect(body.students).toHaveLength(2);

    for (const listed of body.students as Array<{ id: string }>) {
      const resolved = await resolveStudySubject(String(teacher._id), listed.id);
      expect(resolved.ok).toBe(true);
    }
  });

  it('everyone it excludes is one the resolver refuses', async () => {
    const teacher = await makeUser('Teacher', 'Ms Diaz');
    const otherTeacher = await makeUser('Teacher', 'Mr Oyelaran');
    const stranger = await makeUser('Student', 'Stranger');
    const archivedStudent = await makeUser('Student', 'Archived Class');
    await makeClassroom(otherTeacher._id, [stranger._id]);
    await makeClassroom(teacher._id, [archivedStudent._id], { isArchived: true });

    const { body } = await listFor(String(teacher._id));
    expect(body.students).toHaveLength(0);

    for (const excluded of [stranger, archivedStudent]) {
      const resolved = await resolveStudySubject(String(teacher._id), String(excluded._id));
      expect(resolved.ok).toBe(false);
    }
  });
});
