import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Types } from 'mongoose';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { requireClassroomTeacher } from '@/lib/teacher/classroomAccess';
import { Classroom } from '@/models/Classroom';
import { User } from '@/models/User';
import { Logger, LogContext } from '@/lib/logging/logger';

/**
 * DELETE /api/teacher/classrooms/:id/students/:studentId
 *
 * Removes a student from the roster. It does NOT delete the account, managed or
 * not, and that is a deliberate choice rather than a shortcut:
 *
 *   - The study history is the student's own work. Sessions, card results, and
 *     an SM-2 review schedule built over weeks are exactly what the claim flow
 *     exists to hand over. Deleting on unenrol would mean a teacher tidying a
 *     roster at the end of term destroys work that was never theirs.
 *   - Removals are usually corrections. Wrong class, duplicate name, student
 *     moved sections. Re-adding after a delete would mint a second account and
 *     orphan the first one's history under a name nobody can find.
 *   - The app already has a considered path for erasing an account: the
 *     soft-delete grace period with `deletedAt` and `purgeScheduledFor`, which
 *     is reversible and cascades properly. A roster button that hard-deletes
 *     would be a second, worse one.
 *
 * Unenrolling does end the teacher's authority over the account: proctoring
 * authorizes through classroom membership, so once the row is off the roster
 * the teacher can no longer record sessions for that student or mint a claim
 * code for them.
 *
 * Archived classrooms are not refused here. A classroom is archived when its
 * teacher's account is deleted, and `lib/api/assertNotArchived.ts` deliberately
 * exempts removing and leaving, because freezing a container must never trap a
 * member inside it or stop an admin cleaning it up.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, studentId } = await params;

    if (!Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: 'That student id is not valid.' }, { status: 400 });
    }

    await dbConnect();

    const access = await requireClassroomTeacher(id, session.user.id, session.user.role);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const studentObjectId = new Types.ObjectId(studentId);
    const enrolled = (access.classroom.students ?? []).some(
      (member) => String(member) === studentId,
    );
    if (!enrolled) {
      return NextResponse.json(
        { error: 'That student is not on this roster.' },
        { status: 404 },
      );
    }

    const student = await User.findById(studentObjectId)
      .select('name isManaged')
      .lean<{ name?: string; isManaged?: boolean } | null>();

    await Classroom.updateOne(
      { _id: access.classroom._id },
      { $pull: { students: studentObjectId } },
    );

    await Logger.info(LogContext.USER, 'Teacher removed a student from a roster.', {
      userId: session.user.id,
      metadata: {
        classroomId: String(access.classroom._id),
        studentId,
        wasManaged: student?.isManaged === true,
      },
    });

    return NextResponse.json({
      success: true,
      removed: {
        id: studentId,
        name: student?.name ?? 'Unnamed student',
        isManaged: student?.isManaged === true,
      },
      // Say so out loud, so the UI can tell the teacher what did and did not
      // happen instead of implying the student is gone.
      accountDeleted: false,
    });
  } catch (error) {
    await Logger.error(LogContext.USER, 'Failed to remove a student from a roster.', { error });
    return NextResponse.json({ error: 'Failed to remove that student.' }, { status: 500 });
  }
}
