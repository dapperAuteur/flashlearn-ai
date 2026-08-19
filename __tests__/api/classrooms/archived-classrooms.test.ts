/**
 * @jest-environment node
 *
 * An archived classroom is frozen, not hidden. Reads keep working for the people
 * already in it, deletes keep working so nobody is trapped, and every write is
 * refused with 409. The paired "still works when active" case is the point of
 * each block: it proves the guard is reading isArchived and not just failing.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('../../../lib/outbox-trigger', () => ({ fireOutboxDrafts: jest.fn() }));
jest.mock('../../../lib/services/activityService', () => ({
  createActivityEvent: jest.fn(async () => {}),
}));

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Classroom } from '@/models/Classroom';
import { School } from '@/models/School';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Assignment } from '@/models/Assignment';
import { POST as createClassroom } from '@/app/api/classrooms/route';
import { POST as joinClassroom } from '@/app/api/classrooms/join/route';
import { DELETE as deleteClassroom } from '@/app/api/classrooms/[id]/route';
import {
  GET as listClassroomSets,
  POST as shareSetToClassroom,
} from '@/app/api/classrooms/[id]/sets/route';
import { POST as createAssignment } from '@/app/api/assignments/route';

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

const TEACHER_ID = '64c000000000000000000001';
const STUDENT_ID = '64c000000000000000000002';

let mongod: MongoMemoryServer;

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
  await Promise.all([
    Classroom.deleteMany({}),
    School.deleteMany({}),
    FlashcardSet.deleteMany({}),
    Assignment.deleteMany({}),
  ]);
});

function signIn(userId: string, role = 'Teacher') {
  mockedSession.mockResolvedValue({ user: { id: userId, role } } as never);
}

function post(path: string, body: unknown) {
  return new NextRequest(`https://flashlearnai.witus.online${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function seedClassroom(isArchived: boolean, joinCode: string) {
  return Classroom.create({
    name: isArchived ? 'Archived Biology' : 'Active Biology',
    teacherId: new Types.ObjectId(TEACHER_ID),
    students: [new Types.ObjectId(STUDENT_ID)],
    joinCode,
    isArchived,
  });
}

async function seedSet() {
  const set = await FlashcardSet.create({
    profile: new Types.ObjectId(),
    title: 'Cell parts',
    cardCount: 1,
    source: 'Prompt',
    flashcards: [{ front: 'Q', back: 'A' }],
  });
  return (set._id as Types.ObjectId).toString();
}

describe('joining a classroom', () => {
  it('refuses a join into an archived classroom with 409', async () => {
    await seedClassroom(true, 'ARCH01');
    signIn('64c00000000000000000000a', 'Student');

    const res = await joinClassroom(post('/api/classrooms/join', { joinCode: 'ARCH01' }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/archived/i);

    const classroom = await Classroom.findOne({ joinCode: 'ARCH01' });
    expect(classroom!.students).toHaveLength(1);
  });

  it('still lets a student join an active classroom', async () => {
    await seedClassroom(false, 'LIVE01');
    signIn('64c00000000000000000000a', 'Student');

    const res = await joinClassroom(post('/api/classrooms/join', { joinCode: 'LIVE01' }));

    expect(res.status).toBe(200);
    const classroom = await Classroom.findOne({ joinCode: 'LIVE01' });
    expect(classroom!.students).toHaveLength(2);
  });
});

describe('sharing a set into a classroom', () => {
  it('refuses a new shared set on an archived classroom with 409', async () => {
    const classroom = await seedClassroom(true, 'ARCH02');
    const setId = await seedSet();
    signIn(TEACHER_ID);

    const id = (classroom._id as Types.ObjectId).toString();
    const res = await shareSetToClassroom(
      post(`/api/classrooms/${id}/sets`, { setId }),
      routeParams(id),
    );

    expect(res.status).toBe(409);
    const reloaded = await Classroom.findById(id);
    expect(reloaded!.sharedSets).toHaveLength(0);
  });

  it('still shares a set into an active classroom', async () => {
    const classroom = await seedClassroom(false, 'LIVE02');
    const setId = await seedSet();
    signIn(TEACHER_ID);

    const id = (classroom._id as Types.ObjectId).toString();
    const res = await shareSetToClassroom(
      post(`/api/classrooms/${id}/sets`, { setId }),
      routeParams(id),
    );

    expect(res.status).toBe(200);
    const reloaded = await Classroom.findById(id);
    expect(reloaded!.sharedSets).toHaveLength(1);
  });

  it('keeps the shared-set list readable while archived', async () => {
    const classroom = await seedClassroom(false, 'LIVE03');
    const setId = await seedSet();
    classroom.sharedSets.push(new Types.ObjectId(setId));
    classroom.isArchived = true;
    await classroom.save();
    signIn(STUDENT_ID, 'Student');

    const id = (classroom._id as Types.ObjectId).toString();
    const res = await listClassroomSets(post(`/api/classrooms/${id}/sets`, {}), routeParams(id));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sets).toHaveLength(1);
  });
});

describe('assignments on an archived classroom', () => {
  it('refuses a new assignment with 409', async () => {
    const classroom = await seedClassroom(true, 'ARCH04');
    const setId = await seedSet();
    signIn(TEACHER_ID);

    const res = await createAssignment(
      post('/api/assignments', {
        title: 'Chapter 2 review',
        flashcardSetId: setId,
        classroomId: (classroom._id as Types.ObjectId).toString(),
      }),
    );

    expect(res.status).toBe(409);
    await expect(Assignment.countDocuments({})).resolves.toBe(0);
  });

  it('still creates an assignment for an active classroom', async () => {
    const classroom = await seedClassroom(false, 'LIVE04');
    const setId = await seedSet();
    signIn(TEACHER_ID);

    const res = await createAssignment(
      post('/api/assignments', {
        title: 'Chapter 2 review',
        flashcardSetId: setId,
        classroomId: (classroom._id as Types.ObjectId).toString(),
      }),
    );

    expect(res.status).toBe(201);
    await expect(Assignment.countDocuments({})).resolves.toBe(1);
  });
});

describe('archived schools', () => {
  it('refuses a new classroom filed under an archived school with 409', async () => {
    const school = await School.create({
      name: 'Northside High',
      schoolCode: 'NORTH1',
      adminId: new Types.ObjectId(),
      isArchived: true,
    });
    signIn(TEACHER_ID);

    const res = await createClassroom(
      post('/api/classrooms', {
        name: 'Chemistry 1',
        schoolId: (school._id as Types.ObjectId).toString(),
      }),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/school is archived/i);
    await expect(Classroom.countDocuments({})).resolves.toBe(0);
  });

  it('still creates a classroom under an active school', async () => {
    const school = await School.create({
      name: 'Northside High',
      schoolCode: 'NORTH2',
      adminId: new Types.ObjectId(),
    });
    signIn(TEACHER_ID);

    const res = await createClassroom(
      post('/api/classrooms', {
        name: 'Chemistry 1',
        schoolId: (school._id as Types.ObjectId).toString(),
      }),
    );

    expect(res.status).toBe(201);
    await expect(Classroom.countDocuments({})).resolves.toBe(1);
  });
});

describe('deleting an archived classroom', () => {
  it('still succeeds so an admin can clean it up', async () => {
    const classroom = await seedClassroom(true, 'ARCH05');
    signIn(TEACHER_ID);

    const id = (classroom._id as Types.ObjectId).toString();
    const res = await deleteClassroom(
      new NextRequest(`https://flashlearnai.witus.online/api/classrooms/${id}`, { method: 'DELETE' }),
      routeParams(id),
    );

    expect(res.status).toBe(200);
    await expect(Classroom.countDocuments({})).resolves.toBe(0);
  });
});
