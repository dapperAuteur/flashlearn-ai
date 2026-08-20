import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Types } from 'mongoose';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { assertNotArchived } from '@/lib/api/assertNotArchived';
import { requireClassroomTeacher } from '@/lib/teacher/classroomAccess';
import { createManagedStudent, isDuplicateKeyError, isManagedEmail } from '@/lib/teacher/managedStudents';
import { User } from '@/models/User';
import { Logger, LogContext } from '@/lib/logging/logger';

/**
 * GET  /api/teacher/classrooms/:id/students   the roster, with managed state
 * POST /api/teacher/classrooms/:id/students   create a managed student and enrol them
 *
 * The existing GET /api/classrooms/:id returns the roster too, but only name
 * and email, which cannot tell a managed account from a student who signed
 * themselves up. Rather than widen a route every classroom member can read,
 * the teacher-only view lives here.
 */

const createStudentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'A name needs at least 2 characters.' })
    .max(80, { message: 'A name can be at most 80 characters.' }),
});

interface RosterRow {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  username?: string;
  isManaged?: boolean;
  managedBy?: Types.ObjectId;
  claimCodeHash?: string;
  claimCodeExpires?: Date;
  deletedAt?: Date | null;
}

function toRosterRow(student: RosterRow, actorId: string) {
  const managed = student.isManaged === true;
  const claimExpires = student.claimCodeExpires ?? null;
  return {
    id: String(student._id),
    name: student.name ?? 'Unnamed student',
    // The synthetic address is an implementation detail of the managed account
    // and tells a teacher nothing, so it is not sent to the browser.
    email: managed || isManagedEmail(student.email) ? null : (student.email ?? null),
    username: student.username ?? null,
    isManaged: managed,
    managedByYou: managed && String(student.managedBy ?? '') === String(actorId),
    hasClaimCode: managed && Boolean(student.claimCodeHash),
    claimCodeExpiresAt: managed && claimExpires ? claimExpires.toISOString() : null,
    claimCodeExpired: Boolean(
      managed && student.claimCodeHash && claimExpires && claimExpires.getTime() <= Date.now(),
    ),
    pendingDeletion: Boolean(student.deletedAt),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const access = await requireClassroomTeacher(id, session.user.id, session.user.role);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const studentIds = access.classroom.students ?? [];
    const students = studentIds.length
      ? await User.find({ _id: { $in: studentIds } })
          .select('name email username isManaged managedBy claimCodeHash claimCodeExpires deletedAt')
          .lean<RosterRow[]>()
      : [];

    const rows = students
      .map((student) => toRosterRow(student, session.user.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      classroom: {
        id: String(access.classroom._id),
        name: access.classroom.name,
        isArchived: access.classroom.isArchived === true,
      },
      students: rows,
    });
  } catch (error) {
    await Logger.error(LogContext.USER, 'Failed to read a classroom roster.', { error });
    return NextResponse.json({ error: 'Failed to read the roster.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Send a JSON body with a name.' }, { status: 400 });
    }

    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await dbConnect();

    const access = await requireClassroomTeacher(id, session.user.id, session.user.role);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const archived = assertNotArchived(access.classroom, 'classroom');
    if (archived) return archived;

    // The account is owned by whoever made the request, which for an admin
    // acting on someone else's classroom is still the classroom's teacher.
    // Ownership follows the classroom, not the caller.
    const teacherId = access.classroom.teacherId;

    // Retry only for a duplicate key. The address is derived from the id the
    // row is about to take, so a collision means an id collision, which should
    // never happen; one retry costs nothing and turns an impossible-but-fatal
    // case into an impossible-and-survivable one.
    let created;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        created = await createManagedStudent({
          name: parsed.data.name,
          teacherId: new Types.ObjectId(String(teacherId)),
          classroomId: new Types.ObjectId(String(access.classroom._id)),
        });
        break;
      } catch (error) {
        if (!isDuplicateKeyError(error) || attempt === 2) throw error;
      }
    }

    if (!created) {
      return NextResponse.json({ error: 'Could not create that student.' }, { status: 500 });
    }

    await Logger.info(LogContext.USER, 'Teacher created a managed student.', {
      userId: session.user.id,
      metadata: {
        classroomId: String(access.classroom._id),
        studentId: String(created.userId),
      },
    });

    return NextResponse.json(
      {
        student: {
          id: String(created.userId),
          name: created.name,
          profileId: String(created.profileId),
          isManaged: true,
          managedByYou: String(teacherId) === String(session.user.id),
          email: null,
          username: null,
          hasClaimCode: true,
          claimCodeExpiresAt: created.claimCodeExpires.toISOString(),
          claimCodeExpired: false,
          pendingDeletion: false,
        },
        // Shown once. Nothing stores the code in the clear, so a teacher who
        // loses it mints a new one from the claim-code route, which invalidates
        // this one.
        claimCode: created.claimCode,
        claimCodeExpiresAt: created.claimCodeExpires.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    await Logger.error(LogContext.USER, 'Failed to create a managed student.', { error });
    return NextResponse.json({ error: 'Failed to create that student.' }, { status: 500 });
  }
}
