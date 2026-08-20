import { Types } from 'mongoose';
import { Classroom } from '@/models/Classroom';

/**
 * The one authorization question every teacher-side roster write asks: is the
 * caller the teacher of THIS classroom?
 *
 * Checking the role alone would let any Teacher add a student to any other
 * teacher's classroom, which is the mistake this exists to make hard to repeat.
 * The comparison is against `Classroom.teacherId`, so holding the Teacher role
 * grants nothing on its own.
 */

export interface TeacherClassroom {
  _id: Types.ObjectId;
  name: string;
  teacherId: Types.ObjectId;
  students?: Types.ObjectId[];
  isArchived?: boolean;
}

export type ClassroomAccessResult =
  | { ok: true; classroom: TeacherClassroom }
  | { ok: false; status: number; error: string };

export async function requireClassroomTeacher(
  classroomId: string,
  actorId: string,
  actorRole?: string | null,
): Promise<ClassroomAccessResult> {
  if (!Types.ObjectId.isValid(classroomId)) {
    return { ok: false, status: 400, error: 'That classroom id is not valid.' };
  }

  const classroom = await Classroom.findById(classroomId)
    .select('name teacherId students isArchived')
    .lean<TeacherClassroom | null>();

  if (!classroom) {
    return { ok: false, status: 404, error: 'Classroom not found.' };
  }

  const isOwner = String(classroom.teacherId) === String(actorId);
  const isAdmin = actorRole === 'Admin';

  if (!isOwner && !isAdmin) {
    return {
      ok: false,
      status: 403,
      error: 'Only the teacher of this classroom can manage its roster.',
    };
  }

  return { ok: true, classroom };
}
