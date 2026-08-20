import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Types } from 'mongoose';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { assertNotArchived } from '@/lib/api/assertNotArchived';
import { requireClassroomTeacher } from '@/lib/teacher/classroomAccess';
import { mintClaimCode } from '@/lib/teacher/managedStudents';
import { User } from '@/models/User';
import { Logger, LogContext } from '@/lib/logging/logger';

/**
 * POST /api/teacher/classrooms/:id/students/:studentId/claim-code
 *
 * Mints a fresh claim code for a managed student and returns it once. Any code
 * issued earlier stops working the moment this succeeds.
 *
 * Nothing keeps the code in the clear, which is why this route exists at all: a
 * teacher who loses the slip of paper cannot look the old code up, and letting
 * them read a stored one back would mean storing a working credential in
 * plaintext for the life of the account.
 *
 * A claim code is refused for an account that is not managed. Handing a teacher
 * a code that resets the email and password of a student who signed themselves
 * up would be an account takeover with a friendly name on it.
 */
export async function POST(
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

    const archived = assertNotArchived(access.classroom, 'classroom');
    if (archived) return archived;

    const enrolled = (access.classroom.students ?? []).some(
      (member) => String(member) === studentId,
    );
    if (!enrolled) {
      return NextResponse.json(
        { error: 'That student is not on this roster.' },
        { status: 404 },
      );
    }

    const student = await User.findById(studentId)
      .select('name isManaged managedBy')
      .lean<{ name?: string; isManaged?: boolean; managedBy?: Types.ObjectId } | null>();

    if (!student) {
      return NextResponse.json({ error: 'That student was not found.' }, { status: 404 });
    }

    if (student.isManaged !== true) {
      return NextResponse.json(
        { error: 'That student already owns their account, so it cannot be claimed.' },
        { status: 409 },
      );
    }

    const { claimCode, claimCodeHash, claimCodeExpires } = mintClaimCode();

    // The `isManaged` guard is repeated in the filter so a claim that lands
    // between the read above and this write is not undone by it.
    const updated = await User.updateOne(
      { _id: studentId, isManaged: true },
      { $set: { claimCodeHash, claimCodeExpires } },
    );

    if (updated.matchedCount === 0) {
      return NextResponse.json(
        { error: 'That student already owns their account, so it cannot be claimed.' },
        { status: 409 },
      );
    }

    await Logger.info(LogContext.USER, 'Teacher minted a claim code for a managed student.', {
      userId: session.user.id,
      metadata: { classroomId: String(access.classroom._id), studentId },
    });

    return NextResponse.json({
      student: { id: studentId, name: student.name ?? 'Unnamed student' },
      claimCode,
      claimCodeExpiresAt: claimCodeExpires.toISOString(),
    });
  } catch (error) {
    await Logger.error(LogContext.USER, 'Failed to mint a claim code.', { error });
    return NextResponse.json({ error: 'Failed to create a claim code.' }, { status: 500 });
  }
}
