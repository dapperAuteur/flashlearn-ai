import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { PROCTOR_ROLES } from '@/lib/study/resolveStudySubject';
import { isManagedEmail } from '@/lib/teacher/managedStudents';
import { User } from '@/models/User';
import { Logger, LogContext } from '@/lib/logging/logger';

/**
 * GET    /api/admin/users/:id/linked-students   who this account is linked to
 * POST   /api/admin/users/:id/linked-students   link one learner
 * DELETE /api/admin/users/:id/linked-students   unlink one learner
 *
 * `User.linkedStudentIds` is one of the two edges
 * `lib/study/resolveStudySubject.ts` authorizes proctoring on, and the one a
 * Parent or Tutor reaches a learner through. The field has been on the schema
 * since it was added with nothing in the app writing to it, so the guardian
 * half of proctoring and of the student analytics page was real in code and
 * unreachable in practice. This is the write.
 *
 * Admin only, and deliberately nothing more. A guardian relationship is a claim
 * about a person that the app cannot check, so a self-serve version needs a
 * consent model that does not exist yet: something the learner, or the
 * learner's school, agrees to. An admin is already trusted with role changes
 * and account deletion here, so admin-only is the honest first step rather than
 * a placeholder for a parent-initiated flow.
 *
 * Every rule below is enforced here rather than in the admin screen, because
 * the screen is a convenience and this route is the boundary.
 */

const secret = process.env.NEXTAUTH_SECRET;

interface GuardianDoc {
  _id: Types.ObjectId;
  name?: string;
  role?: string;
  linkedStudentIds?: Types.ObjectId[];
}

interface StudentDoc {
  _id: Types.ObjectId;
  name?: string;
  username?: string;
  email?: string;
  isManaged?: boolean;
  deletedAt?: Date | null;
}

function toStudentRow(student: StudentDoc) {
  const managed = student.isManaged === true || isManagedEmail(student.email);
  return {
    id: String(student._id),
    name: student.name || student.username || 'Unnamed student',
    // A managed account's address is synthetic and can never receive mail, so
    // it tells an admin nothing and is not sent to the browser.
    email: managed ? null : (student.email ?? null),
    isManaged: managed,
    // A link to an account inside its deletion grace period still exists but no
    // longer resolves, so say so instead of showing a name that quietly fails.
    pendingDeletion: Boolean(student.deletedAt),
  };
}

/** The shape all three verbs answer with, so the screen re-renders from one payload. */
async function guardianPayload(guardian: GuardianDoc) {
  const linkedIds = guardian.linkedStudentIds ?? [];

  const students = linkedIds.length
    ? await User.find({ _id: { $in: linkedIds } })
        .select('name username email isManaged deletedAt')
        .lean<StudentDoc[]>()
    : [];

  return {
    guardian: {
      id: String(guardian._id),
      name: guardian.name ?? 'Unnamed account',
      role: guardian.role ?? 'Student',
      // The resolver refuses a proctor whose role is not on this list, so a
      // link on such an account is dead weight. The screen says so out loud.
      canProctor: Boolean(guardian.role && PROCTOR_ROLES.includes(guardian.role)),
    },
    students: students
      .map(toStudentRow)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

type AdminCheck =
  | { ok: true; adminId: string }
  | { ok: false; response: NextResponse };

async function requireAdmin(request: NextRequest): Promise<AdminCheck> {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }),
    };
  }
  return { ok: true, adminId: String(token.id ?? '') };
}

async function loadGuardian(id: string): Promise<GuardianDoc | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  return User.findById(id)
    .select('name role linkedStudentIds')
    .lean<GuardianDoc | null>();
}

/** The student id both write verbs take, validated the same way for both. */
async function readStudentId(request: NextRequest): Promise<string | null> {
  try {
    const body = await request.json();
    const studentId = (body as { studentId?: unknown }).studentId;
    return typeof studentId === 'string' ? studentId.trim() : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await params;

  try {
    await dbConnect();

    const guardian = await loadGuardian(id);
    if (!guardian) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(await guardianPayload(guardian));
  } catch (error) {
    console.error('Error listing linked students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const studentId = await readStudentId(request);

  if (!studentId || !Types.ObjectId.isValid(studentId)) {
    return NextResponse.json({ error: 'That student id is not valid.' }, { status: 400 });
  }

  // Nobody is their own guardian. Beyond being nonsense, a self-link is an
  // account handing itself the proctor edge, which is the one thing this field
  // must never be able to do.
  if (studentId === id) {
    return NextResponse.json(
      { error: 'An account cannot be linked to itself.' },
      { status: 400 },
    );
  }

  try {
    await dbConnect();

    const guardian = await loadGuardian(id);
    if (!guardian) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!guardian.role || !PROCTOR_ROLES.includes(guardian.role)) {
      return NextResponse.json(
        {
          error:
            'Only a Teacher, Tutor, Parent, SchoolAdmin, or Admin account can be linked to a student.',
        },
        { status: 400 },
      );
    }

    const student = await User.findById(studentId)
      .select('name username email isManaged deletedAt')
      .lean<StudentDoc | null>();

    if (!student) {
      return NextResponse.json({ error: 'That student was not found.' }, { status: 404 });
    }
    // Same refusal and same status the resolver gives for a subject on its way
    // out, so the two agree about an account in the deletion grace period.
    if (student.deletedAt) {
      return NextResponse.json(
        { error: 'That account is scheduled for deletion.' },
        { status: 409 },
      );
    }

    // $addToSet rather than $push: linking someone already linked is a no-op,
    // not a second copy in the array that then needs two unlinks to clear.
    await User.updateOne(
      { _id: guardian._id },
      { $addToSet: { linkedStudentIds: new Types.ObjectId(studentId) } },
    );

    Logger.info(LogContext.SYSTEM, `Admin linked student ${studentId} to user ${id}`, {
      adminId: admin.adminId,
      guardianRole: guardian.role,
      studentIsManaged: student.isManaged === true,
    });

    const refreshed = await loadGuardian(id);
    return NextResponse.json(refreshed ? await guardianPayload(refreshed) : { students: [] });
  } catch (error) {
    console.error('Error linking student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const studentId = await readStudentId(request);

  if (!studentId || !Types.ObjectId.isValid(studentId)) {
    return NextResponse.json({ error: 'That student id is not valid.' }, { status: 400 });
  }

  try {
    await dbConnect();

    const guardian = await loadGuardian(id);
    if (!guardian) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const linked = (guardian.linkedStudentIds ?? []).some(
      (candidate) => String(candidate) === studentId,
    );
    if (!linked) {
      return NextResponse.json(
        { error: 'That student is not linked to this account.' },
        { status: 404 },
      );
    }

    await User.updateOne(
      { _id: guardian._id },
      { $pull: { linkedStudentIds: new Types.ObjectId(studentId) } },
    );

    Logger.info(LogContext.SYSTEM, `Admin unlinked student ${studentId} from user ${id}`, {
      adminId: admin.adminId,
    });

    const refreshed = await loadGuardian(id);
    return NextResponse.json(refreshed ? await guardianPayload(refreshed) : { students: [] });
  } catch (error) {
    console.error('Error unlinking student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
