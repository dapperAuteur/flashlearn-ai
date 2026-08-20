/**
 * @jest-environment node
 *
 * GET /api/classrooms/:id
 *
 * The route populated every student's `email` and returned the document to any
 * caller who passed the access check, and that check admits enrolled students.
 * So any student in a class could read every classmate's real address by
 * opening the network tab. Nothing in the UI showed it, which is exactly why it
 * survived: the data left the server whether or not a page rendered it.
 *
 * These tests assert the response body, not the screen, because that is the
 * layer the leak was at.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';

let currentSession: { user: { id: string; role?: string } } | null = null;

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () => currentSession),
}));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));

import { Classroom } from '@/models/Classroom';
import { User } from '@/models/User';
import { GET } from '@/app/api/classrooms/[id]/route';

let mongod: MongoMemoryServer;
let teacher: any;
let alice: any;
let bob: any;
let managed: any;
let classroom: any;

const call = (id: string) =>
  GET(new NextRequest(`http://localhost/api/classrooms/${id}`), {
    params: Promise.resolve({ id }),
  });

const studentsByName = (body: any) =>
  Object.fromEntries(body.classroom.students.map((s: any) => [s.name, s]));

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  teacher = await User.create({
    name: 'Ms Reyes', email: 'reyes@school.example', password: 'x', role: 'Teacher',
  });
  alice = await User.create({
    name: 'Alice', email: 'alice@example.com', password: 'x', role: 'Student',
  });
  bob = await User.create({
    name: 'Bob', email: 'bob@example.com', password: 'x', role: 'Student',
  });
  managed = await User.create({
    name: 'Cleo', email: 'managed-abc@students.invalid', role: 'Student',
    isManaged: true, managedBy: teacher._id,
  });

  classroom = await Classroom.create({
    name: 'Period 3',
    teacherId: teacher._id,
    students: [alice._id, bob._id, managed._id],
    joinCode: 'ABC123',
  });
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('a classmate cannot read the roster addresses', () => {
  it('gives an enrolled student names but no email addresses', async () => {
    currentSession = { user: { id: String(alice._id), role: 'Student' } };

    const res = await call(String(classroom._id));
    expect(res.status).toBe(200);

    const body = await res.json();
    const seen = studentsByName(body);

    // Alice can still see who is in the room.
    expect(Object.keys(seen).sort()).toEqual(['Alice', 'Bob', 'Cleo']);
    // She cannot see how to reach any of them, her own row included, since the
    // route has no reason to hand back an address she already knows.
    for (const student of body.classroom.students) {
      expect(student.email).toBeNull();
    }
    expect(body.classroom.teacherId.email).toBeNull();

    // The strongest form of the assertion: the address does not appear anywhere
    // in the payload, whatever shape a future refactor gives it.
    expect(JSON.stringify(body)).not.toContain('bob@example.com');
  });

  it('gives the teacher the real addresses', async () => {
    currentSession = { user: { id: String(teacher._id), role: 'Teacher' } };

    const body = await (await call(String(classroom._id))).json();
    const seen = studentsByName(body);

    expect(seen.Alice.email).toBe('alice@example.com');
    expect(seen.Bob.email).toBe('bob@example.com');
  });

  it('withholds the synthetic address of a managed account even from the teacher', async () => {
    // It exists to satisfy a unique index and can never receive mail. Printing
    // it invites somebody to try, and to believe the student has an inbox.
    currentSession = { user: { id: String(teacher._id), role: 'Teacher' } };

    const body = await (await call(String(classroom._id))).json();
    expect(studentsByName(body).Cleo.email).toBeNull();
    expect(JSON.stringify(body)).not.toContain('students.invalid');
  });

  it('still refuses somebody with no connection to the classroom', async () => {
    const outsider = await User.create({
      name: 'Outsider', email: 'outsider@example.com', password: 'x', role: 'Student',
    });
    currentSession = { user: { id: String(outsider._id), role: 'Student' } };

    expect((await call(String(classroom._id))).status).toBe(403);
  });
});
