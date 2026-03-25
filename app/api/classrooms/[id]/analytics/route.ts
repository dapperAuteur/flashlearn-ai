/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Classroom } from '@/models/Classroom';
import { StudySession } from '@/models/StudySession';

interface Params {
  params: Promise<{ id: string }>;
}

// GET - Get classroom-level analytics
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await dbConnect();

    const classroom = await Classroom.findById(id)
      .populate('students', 'name email')
      .lean() as any;

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Only the teacher can view analytics
    if (classroom.teacherId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Only the teacher can view analytics' }, { status: 403 });
    }

    // Fetch study session stats for each student
    const studentAnalytics = await Promise.all(
      classroom.students.map(async (student: any) => {
        const sessions = await StudySession.aggregate([
          { $match: { userId: student._id, status: 'completed' } },
          {
            $group: {
              _id: null,
              sessionCount: { $sum: 1 },
              totalCorrect: { $sum: '$correctCount' },
              totalIncorrect: { $sum: '$incorrectCount' },
            },
          },
        ]);

        const stats = sessions[0] || { sessionCount: 0, totalCorrect: 0, totalIncorrect: 0 };
        const totalAnswered = stats.totalCorrect + stats.totalIncorrect;
        const averageAccuracy = totalAnswered > 0
          ? Math.round((stats.totalCorrect / totalAnswered) * 100)
          : 0;

        return {
          studentId: student._id,
          name: student.name,
          email: student.email,
          sessionCount: stats.sessionCount,
          averageAccuracy,
        };
      }),
    );

    return NextResponse.json({ analytics: studentAnalytics });
  } catch (error) {
    console.error('Error fetching classroom analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch classroom analytics' }, { status: 500 });
  }
}
