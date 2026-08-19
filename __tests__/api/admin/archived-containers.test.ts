/**
 * @jest-environment node
 *
 * Admin reassignment for the containers account deletion freezes.
 *
 *   GET   /api/admin/archived-containers
 *   PATCH /api/admin/archived-containers/:kind/:id
 *
 * The case that matters most is the ordinary one: the former owner's User row
 * is gone, so resolving the retained owner reference finds nothing. That is the
 * expected result, not an error, and the listing has to keep working.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { SYSTEM: 'system' },
}));

let mockToken: { id?: string; role?: string } | null = null;
jest.mock('next-auth/jwt', () => ({
  getToken: async () => mockToken,
}));

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { Classroom } from '@/models/Classroom';
import { Team } from '@/models/Team';
import { School } from '@/models/School';
import { User } from '@/models/User';
import { GET as listArchived } from '@/app/api/admin/archived-containers/route';
import { PATCH as patchContainer } from '@/app/api/admin/archived-containers/[kind]/[id]/route';

const ADMIN_ID = '64d000000000000000000001';
const STUDENT_A = new Types.ObjectId('64d000000000000000000011');
const STUDENT_B = new Types.ObjectId('64d000000000000000000012');
const MEMBER_A = new Types.ObjectId('64d000000000000000000021');
const TEACHER_A = new Types.ObjectId('64d000000000000000000031');

/** Ids kept as the deletion breadcrumb. No User row will ever match them. */
const GONE_TEACHER = new Types.ObjectId('64d0000000000000000000f1');
const GONE_CREATOR = new Types.ObjectId('64d0000000000000000000f2');
const GONE_ADMIN = new Types.ObjectId('64d0000000000000000000f3');

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
  mockToken = null;
  await Promise.all([
    Classroom.deleteMany({}),
    Team.deleteMany({}),
    School.deleteMany({}),
    User.deleteMany({}),
  ]);
});

function signInAdmin() {
  mockToken = { id: ADMIN_ID, role: 'Admin' };
}

function signIn(role: string) {
  mockToken = { id: '64d0000000000000000000aa', role };
}

function getRequest() {
  return new NextRequest('https://flashlearnai.witus.online/api/admin/archived-containers');
}

function patchRequest(kind: string, id: string, body: unknown) {
  return new NextRequest(
    `https://flashlearnai.witus.online/api/admin/archived-containers/${kind}/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

function routeParams(kind: string, id: string) {
  return { params: Promise.resolve({ kind, id }) };
}

async function makeUser(overrides: Record<string, unknown> = {}) {
  return User.create({
    name: 'Nadia Okonkwo',
    email: `owner-${new Types.ObjectId().toString()}@example.com`,
    role: 'Teacher',
    ...overrides,
  });
}

async function seedArchivedClassroom(joinCode = 'ARCH10') {
  return Classroom.create({
    name: 'Archived Biology',
    teacherId: GONE_TEACHER,
    students: [STUDENT_A, STUDENT_B],
    joinCode,
    isArchived: true,
  });
}

async function seedArchivedTeam(joinCode = 'ARCH20') {
  return Team.create({
    name: 'Archived Study Group',
    creatorId: GONE_CREATOR,
    members: [{ userId: MEMBER_A, role: 'member', joinedAt: new Date() }],
    joinCode,
    isArchived: true,
  });
}

async function seedArchivedSchool(schoolCode = 'ARCH30') {
  return School.create({
    name: 'Archived Academy',
    adminId: GONE_ADMIN,
    teachers: [TEACHER_A],
    students: [STUDENT_A],
    schoolCode,
    isArchived: true,
  });
}

describe('GET /api/admin/archived-containers', () => {
  it('refuses a caller who is not an admin', async () => {
    signIn('Teacher');
    const res = await listArchived(getRequest());
    expect(res.status).toBe(403);
  });

  it('refuses a signed-out caller', async () => {
    mockToken = null;
    const res = await listArchived(getRequest());
    expect(res.status).toBe(403);
  });

  it('lists archived containers of all three kinds and skips active ones', async () => {
    await seedArchivedClassroom();
    await seedArchivedTeam();
    await seedArchivedSchool();
    await Classroom.create({
      name: 'Live Chemistry',
      teacherId: new Types.ObjectId(),
      students: [STUDENT_A],
      joinCode: 'LIVE10',
      isArchived: false,
    });
    signInAdmin();

    const res = await listArchived(getRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.counts).toEqual({ classroom: 1, team: 1, school: 1, total: 3 });
    const kinds = body.containers.map((c: { kind: string }) => c.kind).sort();
    expect(kinds).toEqual(['classroom', 'school', 'team']);
    expect(body.containers.some((c: { name: string }) => c.name === 'Live Chemistry')).toBe(false);

    const classroom = body.containers.find((c: { kind: string }) => c.kind === 'classroom');
    expect(classroom.memberCount).toBe(2);
    const school = body.containers.find((c: { kind: string }) => c.kind === 'school');
    expect(school.memberCount).toBe(2);
    expect(school.teacherCount).toBe(1);
    expect(school.studentCount).toBe(1);
    expect(body.eligibleRoles.classroom).toEqual(['Teacher', 'Tutor', 'SchoolAdmin', 'Admin']);
  });

  it('reports a former owner whose account is gone instead of failing', async () => {
    await seedArchivedClassroom();
    signInAdmin();

    const res = await listArchived(getRequest());
    const body = await res.json();
    const classroom = body.containers[0];

    expect(classroom.formerOwner).toBeNull();
    expect(classroom.formerOwnerId).toBe(GONE_TEACHER.toString());
  });

  it('resolves a former owner whose account still exists', async () => {
    const owner = await makeUser({ name: 'Rosa Delgado', role: 'Teacher' });
    await Classroom.create({
      name: 'Mistakenly Archived',
      teacherId: owner._id,
      students: [STUDENT_A],
      joinCode: 'ARCH11',
      isArchived: true,
    });
    signInAdmin();

    const res = await listArchived(getRequest());
    const body = await res.json();
    const classroom = body.containers[0];

    expect(classroom.formerOwner.name).toBe('Rosa Delgado');
    expect(classroom.formerOwner.pendingDeletion).toBe(false);
    expect(classroom.formerOwner.canReclaim).toBe(true);
  });

  it('marks a former owner inside the deletion grace period as unable to reclaim', async () => {
    const owner = await makeUser({ role: 'Teacher', deletedAt: new Date() });
    await Classroom.create({
      name: 'Owner Leaving',
      teacherId: owner._id,
      students: [],
      joinCode: 'ARCH12',
      isArchived: true,
    });
    signInAdmin();

    const res = await listArchived(getRequest());
    const body = await res.json();

    expect(body.containers[0].formerOwner.pendingDeletion).toBe(true);
    expect(body.containers[0].formerOwner.canReclaim).toBe(false);
  });
});

describe('PATCH reassigns a classroom', () => {
  it('sets the new teacher, clears isArchived, and leaves the students alone', async () => {
    const classroom = await seedArchivedClassroom();
    const newOwner = await makeUser({ role: 'Teacher' });
    signInAdmin();

    const res = await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {
        newOwnerId: newOwner._id.toString(),
      }),
      routeParams('classroom', classroom._id.toString()),
    );
    expect(res.status).toBe(200);

    const updated = await Classroom.findById(classroom._id);
    expect(updated!.teacherId.toString()).toBe(newOwner._id.toString());
    expect(updated!.isArchived).toBe(false);
    expect(updated!.students.map(String).sort()).toEqual(
      [STUDENT_A.toString(), STUDENT_B.toString()].sort(),
    );
  });

  it('does not put the new teacher on the student roster', async () => {
    const classroom = await seedArchivedClassroom('ARCH13');
    const newOwner = await makeUser({ role: 'Tutor' });
    signInAdmin();

    await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {
        newOwnerId: newOwner._id.toString(),
      }),
      routeParams('classroom', classroom._id.toString()),
    );

    const updated = await Classroom.findById(classroom._id);
    expect(updated!.students.map(String)).not.toContain(newOwner._id.toString());
    expect(updated!.students).toHaveLength(2);
  });

  it('finds the new owner by email', async () => {
    const classroom = await seedArchivedClassroom('ARCH14');
    const newOwner = await makeUser({ role: 'SchoolAdmin', email: 'new.owner@example.com' });
    signInAdmin();

    const res = await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {
        newOwnerEmail: 'New.Owner@example.com',
      }),
      routeParams('classroom', classroom._id.toString()),
    );

    expect(res.status).toBe(200);
    const updated = await Classroom.findById(classroom._id);
    expect(updated!.teacherId.toString()).toBe(newOwner._id.toString());
  });

  it('is safe to run twice', async () => {
    const classroom = await seedArchivedClassroom('ARCH15');
    const newOwner = await makeUser({ role: 'Teacher' });
    signInAdmin();

    const first = await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {
        newOwnerId: newOwner._id.toString(),
      }),
      routeParams('classroom', classroom._id.toString()),
    );
    const second = await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {
        newOwnerId: newOwner._id.toString(),
      }),
      routeParams('classroom', classroom._id.toString()),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const updated = await Classroom.findById(classroom._id);
    expect(updated!.teacherId.toString()).toBe(newOwner._id.toString());
    expect(updated!.isArchived).toBe(false);
    expect(updated!.students).toHaveLength(2);
  });
});

describe('PATCH reassigns a study group', () => {
  it('sets the creator, adds them as an admin member, and keeps the roster', async () => {
    const team = await seedArchivedTeam();
    const newOwner = await makeUser({ role: 'Student' });
    signInAdmin();

    const res = await patchContainer(
      patchRequest('team', team._id.toString(), { newOwnerId: newOwner._id.toString() }),
      routeParams('team', team._id.toString()),
    );
    expect(res.status).toBe(200);

    const updated = await Team.findById(team._id);
    expect(updated!.creatorId.toString()).toBe(newOwner._id.toString());
    expect(updated!.isArchived).toBe(false);
    expect(updated!.members).toHaveLength(2);
    expect(updated!.members.map((m: { userId: Types.ObjectId }) => m.userId.toString())).toContain(
      MEMBER_A.toString(),
    );
    const ownerRow = updated!.members.find(
      (m: { userId: Types.ObjectId }) => m.userId.toString() === newOwner._id.toString(),
    );
    expect(ownerRow.role).toBe('admin');
  });

  it('promotes a new owner who is already a member instead of duplicating them', async () => {
    const newOwner = await makeUser({ role: 'Student' });
    const team = await Team.create({
      name: 'Existing Member Takes Over',
      creatorId: GONE_CREATOR,
      members: [
        { userId: MEMBER_A, role: 'member', joinedAt: new Date() },
        { userId: newOwner._id, role: 'viewer', joinedAt: new Date() },
      ],
      joinCode: 'ARCH21',
      isArchived: true,
    });
    signInAdmin();

    await patchContainer(
      patchRequest('team', team._id.toString(), { newOwnerId: newOwner._id.toString() }),
      routeParams('team', team._id.toString()),
    );

    const updated = await Team.findById(team._id);
    expect(updated!.members).toHaveLength(2);
    const ownerRow = updated!.members.find(
      (m: { userId: Types.ObjectId }) => m.userId.toString() === newOwner._id.toString(),
    );
    expect(ownerRow.role).toBe('admin');
  });

  it('adds the owner only once across repeated calls', async () => {
    const team = await seedArchivedTeam('ARCH22');
    const newOwner = await makeUser({ role: 'Parent' });
    signInAdmin();

    await patchContainer(
      patchRequest('team', team._id.toString(), { newOwnerId: newOwner._id.toString() }),
      routeParams('team', team._id.toString()),
    );
    const second = await patchContainer(
      patchRequest('team', team._id.toString(), { newOwnerId: newOwner._id.toString() }),
      routeParams('team', team._id.toString()),
    );

    expect(second.status).toBe(200);
    const updated = await Team.findById(team._id);
    expect(updated!.members).toHaveLength(2);
  });
});

describe('PATCH reassigns a school', () => {
  it('sets the administrator and leaves both rosters alone', async () => {
    const school = await seedArchivedSchool();
    const newOwner = await makeUser({ role: 'SchoolAdmin' });
    signInAdmin();

    const res = await patchContainer(
      patchRequest('school', school._id.toString(), { newOwnerId: newOwner._id.toString() }),
      routeParams('school', school._id.toString()),
    );
    expect(res.status).toBe(200);

    const updated = await School.findById(school._id);
    expect(updated!.adminId.toString()).toBe(newOwner._id.toString());
    expect(updated!.isArchived).toBe(false);
    expect(updated!.teachers.map(String)).toEqual([TEACHER_A.toString()]);
    expect(updated!.students.map(String)).toEqual([STUDENT_A.toString()]);
    expect(updated!.teachers.map(String)).not.toContain(newOwner._id.toString());
  });

  it('refuses a Teacher as a school administrator', async () => {
    const school = await seedArchivedSchool('ARCH31');
    const newOwner = await makeUser({ role: 'Teacher' });
    signInAdmin();

    const res = await patchContainer(
      patchRequest('school', school._id.toString(), { newOwnerId: newOwner._id.toString() }),
      routeParams('school', school._id.toString()),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/SchoolAdmin/);
    const unchanged = await School.findById(school._id);
    expect(unchanged!.isArchived).toBe(true);
  });
});

describe('PATCH refuses the wrong caller or the wrong new owner', () => {
  it('refuses a caller who is not an admin', async () => {
    const classroom = await seedArchivedClassroom('ARCH16');
    const newOwner = await makeUser({ role: 'Teacher' });
    signIn('Teacher');

    const res = await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {
        newOwnerId: newOwner._id.toString(),
      }),
      routeParams('classroom', classroom._id.toString()),
    );

    expect(res.status).toBe(403);
    const unchanged = await Classroom.findById(classroom._id);
    expect(unchanged!.isArchived).toBe(true);
    expect(unchanged!.teacherId.toString()).toBe(GONE_TEACHER.toString());
  });

  it('refuses an account that is inside its deletion grace period', async () => {
    const classroom = await seedArchivedClassroom('ARCH17');
    const newOwner = await makeUser({ role: 'Teacher', deletedAt: new Date() });
    signInAdmin();

    const res = await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {
        newOwnerId: newOwner._id.toString(),
      }),
      routeParams('classroom', classroom._id.toString()),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/grace period/i);
    const unchanged = await Classroom.findById(classroom._id);
    expect(unchanged!.isArchived).toBe(true);
  });

  it('refuses a role that cannot own a classroom', async () => {
    const classroom = await seedArchivedClassroom('ARCH18');
    const newOwner = await makeUser({ role: 'Student' });
    signInAdmin();

    const res = await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {
        newOwnerId: newOwner._id.toString(),
      }),
      routeParams('classroom', classroom._id.toString()),
    );

    expect(res.status).toBe(400);
    const unchanged = await Classroom.findById(classroom._id);
    expect(unchanged!.teacherId.toString()).toBe(GONE_TEACHER.toString());
  });

  it('refuses a suspended account', async () => {
    const classroom = await seedArchivedClassroom('ARCH19');
    const newOwner = await makeUser({ role: 'Teacher', suspended: true });
    signInAdmin();

    const res = await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {
        newOwnerId: newOwner._id.toString(),
      }),
      routeParams('classroom', classroom._id.toString()),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/suspended/i);
  });

  it('refuses an account that does not exist', async () => {
    const classroom = await seedArchivedClassroom('ARCH1A');
    signInAdmin();

    const res = await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {
        newOwnerId: new Types.ObjectId().toString(),
      }),
      routeParams('classroom', classroom._id.toString()),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no account/i);
  });

  it('refuses an unknown container kind', async () => {
    signInAdmin();
    const id = new Types.ObjectId().toString();

    const res = await patchContainer(
      patchRequest('district', id, { newOwnerId: id }),
      routeParams('district', id),
    );

    expect(res.status).toBe(400);
  });

  it('returns 404 for a container that is not there', async () => {
    signInAdmin();
    const id = new Types.ObjectId().toString();

    const res = await patchContainer(
      patchRequest('classroom', id, {}),
      routeParams('classroom', id),
    );

    expect(res.status).toBe(404);
  });
});

describe('PATCH unarchives without reassigning', () => {
  it('unfreezes a container whose owner is still a live account', async () => {
    const owner = await makeUser({ role: 'Teacher' });
    const classroom = await Classroom.create({
      name: 'Archived By Mistake',
      teacherId: owner._id,
      students: [STUDENT_A],
      joinCode: 'ARCH1B',
      isArchived: true,
    });
    signInAdmin();

    const res = await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {}),
      routeParams('classroom', classroom._id.toString()),
    );

    expect(res.status).toBe(200);
    const updated = await Classroom.findById(classroom._id);
    expect(updated!.isArchived).toBe(false);
    expect(updated!.teacherId.toString()).toBe(owner._id.toString());
    expect(updated!.students).toHaveLength(1);
  });

  it('refuses to unfreeze a container whose owner account is gone', async () => {
    const classroom = await seedArchivedClassroom('ARCH1C');
    signInAdmin();

    const res = await patchContainer(
      patchRequest('classroom', classroom._id.toString(), {}),
      routeParams('classroom', classroom._id.toString()),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/new owner/i);
    const unchanged = await Classroom.findById(classroom._id);
    expect(unchanged!.isArchived).toBe(true);
  });
});
