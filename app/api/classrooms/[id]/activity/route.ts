import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Classroom } from '@/models/Classroom';
import { ActivityEvent } from '@/models/ActivityEvent';
import { User } from '@/models/User';

interface Params {
  params: Promise<{ id: string }>;
}

const RELEVANT_TYPES = [
  'study_session',
  'achievement_earned',
  'set_created',
  'set_shared',
  'challenge_completed',
] as const;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// GET /api/classrooms/[id]/activity
// Returns recent activity events from members of this classroom
// (the teacher and the enrolled students). Teacher or enrolled
// student can read; admins always can.
export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const limit = Math.min(
    MAX_LIMIT,
    Number(new URL(request.url).searchParams.get('limit')) || DEFAULT_LIMIT,
  );

  try {
    await dbConnect();

    const classroom = await Classroom.findById(id)
      .select('teacherId students')
      .lean<{ teacherId: { toString(): string }; students: { toString(): string }[] }>();
    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    const teacherIdStr = classroom.teacherId.toString();
    const studentIdStrs = classroom.students.map((s) => s.toString());
    const memberIds = [teacherIdStr, ...studentIdStrs];

    const isTeacher = teacherIdStr === session.user.id;
    const isEnrolled = studentIdStrs.includes(session.user.id);
    if (!isTeacher && !isEnrolled && session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const events = await ActivityEvent.find({
      userId: { $in: memberIds },
      type: { $in: RELEVANT_TYPES },
      visibility: { $in: ['public', 'followers'] },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const userIds = Array.from(new Set(events.map((e) => e.userId.toString())));
    const users = await User.find({ _id: { $in: userIds } })
      .select('name username profilePicture')
      .lean<{ _id: { toString(): string }; name?: string; username?: string; profilePicture?: string }[]>();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const feed = events.map((e) => {
      const user = userMap.get(e.userId.toString());
      return {
        _id: e._id?.toString() ?? '',
        type: e.type,
        metadata: e.metadata,
        createdAt: e.createdAt,
        userId: e.userId.toString(),
        userName: user?.username || user?.name || 'A member',
        profilePicture: user?.profilePicture || null,
      };
    });

    return NextResponse.json({ feed });
  } catch (error) {
    console.error('Error fetching classroom activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
