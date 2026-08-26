import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { buildStudentAnalytics } from '@/lib/teacher/studentAnalytics';
import { authorizeStudentAnalyticsRead } from '@/lib/teacher/studentAnalyticsAccess';
import { Logger, LogContext } from '@/lib/logging/logger';

/**
 * GET /api/teacher/students/:studentId/analytics
 *
 * One learner's study numbers for an adult who is allowed to see them.
 *
 * The path sits under /api/teacher/students because that is where the other
 * routes about a single student already live (claim, and the roster routes one
 * level up under a classroom). It is keyed on the student rather than on a
 * classroom on purpose: a parent or tutor reaches a learner through
 * `linkedStudentIds` and has no classroom to name, and nesting the route under
 * one would have shut them out of a feature they were explicitly asked for.
 *
 * Authorization is not decided here. `authorizeStudentAnalyticsRead` asks
 * `lib/study/resolveStudySubject.ts`, the module the study write path uses, so
 * the set of people who can read a student's numbers is the same set that can
 * record results for them, by construction rather than by two rules agreeing.
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId } = await params;
    await dbConnect();

    const access = await authorizeStudentAnalyticsRead(session.user.id, studentId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const report = await buildStudentAnalytics({
      userId: access.student.userId,
      profileIds: access.student.profileIds,
    });

    return NextResponse.json({
      student: {
        id: String(access.student.userId),
        name: access.student.name,
        isManaged: access.student.isManaged,
        isSelf: access.student.isSelf,
        // No email address. A managed account's is synthetic and unusable, and
        // a teacher does not need a self-signed-up student's address to read a
        // progress table.
      },
      ...report,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    await Logger.error(LogContext.STUDY, 'Failed to read a student analytics report.', { error });
    return NextResponse.json({ error: 'Could not load that student progress.' }, { status: 500 });
  }
}
