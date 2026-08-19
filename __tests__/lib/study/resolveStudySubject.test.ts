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

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Profile.deleteMany({}),
    Classroom.deleteMany({}),
  ]);
});

let emailSeq = 0;

async function makeUser(role: string, extra: Record<string, unknown> = {}) {
  emailSeq += 1;
  const user = await User.create({
    name: `${role} ${emailSeq}`,
    email: `user${emailSeq}@example.com`,
    password: 'x',
    role,
    ...extra,
  });
  const profile = await Profile.create({ user: user._id, profileName: 'My Profile' });
  await User.findByIdAndUpdate(user._id, { $push: { profiles: profile._id } });

  return { user, profileId: profile._id as Types.ObjectId };
}

async function makeClassroom(
  teacherId: Types.ObjectId,
  studentIds: Types.ObjectId[],
  extra: Record<string, unknown> = {},
) {
  return Classroom.create({
    name: 'Period 3',
    teacherId,
    students: studentIds,
    joinCode: `JC${Date.now()}${Math.floor(emailSeq)}`.slice(0, 10).toUpperCase(),
    ...extra,
  });
}

describe('resolveStudySubject: self-study', () => {
  it('resolves the signed-in learner when no subject is named', async () => {
    const { user, profileId } = await makeUser('Student');

    const result = await resolveStudySubject(String(user._id));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(String(result.subject.userId)).toBe(String(user._id));
    expect(String(result.subject.profileId)).toBe(String(profileId));
    expect(result.subject.proctorId).toBeNull();
    expect(result.subject.isProctored).toBe(false);
  });

  it('treats naming yourself the same as naming nobody', async () => {
    const { user } = await makeUser('Student');

    const result = await resolveStudySubject(String(user._id), String(user._id));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subject.isProctored).toBe(false);
    expect(result.subject.proctorId).toBeNull();
  });

  it('creates a profile for a learner who has never studied', async () => {
    const user = await User.create({
      name: 'No Profile',
      email: 'noprofile@example.com',
      password: 'x',
      role: 'Student',
    });

    const result = await resolveStudySubject(String(user._id));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subject.profileId).toBeDefined();
    const stored = await Profile.findById(result.subject.profileId).lean();
    expect(stored).not.toBeNull();
  });

  it('rejects an actor id that is not an object id', async () => {
    const result = await resolveStudySubject('not-an-id');

    expect(result).toMatchObject({ ok: false, status: 401 });
  });
});

describe('resolveStudySubject: proctoring authorization', () => {
  it('lets a teacher record for a student in their own classroom', async () => {
    const teacher = await makeUser('Teacher');
    const student = await makeUser('Student');
    await makeClassroom(teacher.user._id, [student.user._id]);

    const result = await resolveStudySubject(String(teacher.user._id), String(student.user._id));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The learner owns the result; the teacher is recorded as the proctor.
    expect(String(result.subject.userId)).toBe(String(student.user._id));
    expect(String(result.subject.profileId)).toBe(String(student.profileId));
    expect(String(result.subject.proctorId)).toBe(String(teacher.user._id));
    expect(result.subject.isProctored).toBe(true);
  });

  it('refuses a teacher who does not share a classroom with the student', async () => {
    const teacher = await makeUser('Teacher');
    const stranger = await makeUser('Student');
    await makeClassroom(teacher.user._id, []);

    const result = await resolveStudySubject(String(teacher.user._id), String(stranger.user._id));

    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('refuses a teacher whose classroom is archived', async () => {
    const teacher = await makeUser('Teacher');
    const student = await makeUser('Student');
    await makeClassroom(teacher.user._id, [student.user._id], { isArchived: true });

    const result = await resolveStudySubject(String(teacher.user._id), String(student.user._id));

    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('refuses a student trying to record for a classmate', async () => {
    const teacher = await makeUser('Teacher');
    const student = await makeUser('Student');
    const classmate = await makeUser('Student');
    await makeClassroom(teacher.user._id, [student.user._id, classmate.user._id]);

    const result = await resolveStudySubject(String(student.user._id), String(classmate.user._id));

    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('accepts the linkedStudentIds edge for a tutor or guardian', async () => {
    const student = await makeUser('Student');
    const tutor = await makeUser('Tutor', { linkedStudentIds: [student.user._id] });

    const result = await resolveStudySubject(String(tutor.user._id), String(student.user._id));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(String(result.subject.userId)).toBe(String(student.user._id));
    expect(result.subject.isProctored).toBe(true);
  });

  it('refuses a subject who does not exist', async () => {
    const teacher = await makeUser('Teacher');

    const result = await resolveStudySubject(String(teacher.user._id), String(new Types.ObjectId()));

    expect(result).toMatchObject({ ok: false, status: 404 });
  });

  it('refuses a subject inside their deletion grace period', async () => {
    const teacher = await makeUser('Teacher');
    const student = await makeUser('Student');
    await makeClassroom(teacher.user._id, [student.user._id]);
    await User.findByIdAndUpdate(student.user._id, { deletedAt: new Date() });

    const result = await resolveStudySubject(String(teacher.user._id), String(student.user._id));

    expect(result).toMatchObject({ ok: false, status: 409 });
  });

  it('rejects a malformed subject id before touching the database', async () => {
    const teacher = await makeUser('Teacher');

    const result = await resolveStudySubject(String(teacher.user._id), 'nope');

    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it('never returns the actor profile when a subject was named and allowed', async () => {
    const teacher = await makeUser('Teacher');
    const student = await makeUser('Student');
    await makeClassroom(teacher.user._id, [student.user._id]);

    const result = await resolveStudySubject(String(teacher.user._id), String(student.user._id));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The bug this guards against writes the teacher's schedule instead of the
    // student's, which is silent and compounds over weeks of reviews.
    expect(String(result.subject.profileId)).not.toBe(String(teacher.profileId));
  });
});
