import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Classroom } from '@/models/Classroom';
import { User } from '@/models/User';
import { Logger, LogContext } from '@/lib/logging/logger';

/**
 * GET /api/study/proctorable-students
 *
 * The students the signed-in user may record results for, so the study setup
 * screen can offer a picker.
 *
 * This must return exactly the people `lib/study/resolveStudySubject.ts` would
 * accept and nobody else. If the two drift apart, the picker offers a student
 * that the write path then refuses, which is a dead end the teacher cannot
 * diagnose. The two sources below mirror that file's two authorization edges.
 *
 * A caller who cannot proctor anyone gets an empty list and a 200, not a 403.
 * A student loading the study screen has done nothing wrong; they simply have
 * nobody to record for.
 */

/** Mirrors PROCTOR_ROLES in lib/study/resolveStudySubject.ts. */
const PROCTOR_ROLES = ['Teacher', 'Tutor', 'Parent', 'SchoolAdmin', 'Admin'];

interface StudentRow {
  _id: mongoose.Types.ObjectId;
  name?: string;
  username?: string;
  deletedAt?: Date | null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const actorId = new mongoose.Types.ObjectId(session.user.id);

    const actor = await User.findById(actorId)
      .select('role linkedStudentIds')
      .lean<{ role?: string; linkedStudentIds?: mongoose.Types.ObjectId[] } | null>();

    if (!actor || !actor.role || !PROCTOR_ROLES.includes(actor.role)) {
      return NextResponse.json({ students: [] });
    }

    // Edge 1: classrooms this user teaches. Archived ones do not count, because
    // a classroom is archived when its teacher's account is deleted, so the
    // relationship it recorded is gone.
    const classrooms = await Classroom.find({
      teacherId: actorId,
      isArchived: { $ne: true },
    })
      .select('name students')
      .lean<Array<{ name: string; students?: mongoose.Types.ObjectId[] }>>();

    // Which classrooms each student is in, so a teacher can tell two people
    // called Alex apart without being shown their email address.
    const classroomsByStudent = new Map<string, string[]>();
    for (const classroom of classrooms) {
      for (const studentId of classroom.students ?? []) {
        const key = String(studentId);
        classroomsByStudent.set(key, [...(classroomsByStudent.get(key) ?? []), classroom.name]);
      }
    }

    // Edge 2: linkedStudentIds, the tutor and guardian relationship.
    const linkedIds = (actor.linkedStudentIds ?? []).map((id) => String(id));

    const candidateIds = new Set<string>([...classroomsByStudent.keys(), ...linkedIds]);
    candidateIds.delete(String(actorId));

    if (candidateIds.size === 0) {
      return NextResponse.json({ students: [] });
    }

    // One query for every candidate. An account inside its deletion grace
    // period is excluded, because the resolver refuses it and offering one
    // would be a dead end.
    const students = await User.find({
      _id: { $in: [...candidateIds].map((id) => new mongoose.Types.ObjectId(id)) },
      deletedAt: null,
    })
      .select('name username')
      .lean<StudentRow[]>();

    const rows = students
      .map((student) => ({
        id: String(student._id),
        name: student.name || student.username || 'Unnamed student',
        username: student.username ?? null,
        classrooms: classroomsByStudent.get(String(student._id)) ?? [],
        // True when the only route to this student is the tutor edge, which is
        // worth showing because it has no classroom to name.
        viaLink: !classroomsByStudent.has(String(student._id)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ students: rows });
  } catch (error) {
    Logger.error(LogContext.STUDY, 'Failed to list proctorable students', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
