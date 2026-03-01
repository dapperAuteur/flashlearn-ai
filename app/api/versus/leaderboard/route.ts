import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { VersusStats } from '@/models/VersusStats';
import { Classroom } from '@/models/Classroom';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'global';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  if (type === 'global') {
    const leaderboard = await VersusStats.find({ totalChallenges: { $gt: 0 } })
      .sort({ rating: -1 })
      .limit(limit)
      .populate('userId', 'name username profilePicture')
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = leaderboard.map((entry: any, index: number) => ({
      rank: index + 1,
      userId: entry.userId?._id || entry.userId,
      userName: entry.userId?.username || entry.userId?.name || 'Unknown',
      userAvatar: entry.userId?.profilePicture || null,
      rating: entry.rating,
      wins: entry.wins,
      losses: entry.losses,
      draws: entry.draws,
      highestScore: entry.highestCompositeScore,
      totalChallenges: entry.totalChallenges,
    }));

    return NextResponse.json({ leaderboard: entries, type });
  }

  if (type === 'classroom') {
    const classroomId = searchParams.get('classroomId');
    if (!classroomId) {
      return NextResponse.json({ message: 'classroomId required for classroom leaderboard' }, { status: 400 });
    }

    const classroom = await Classroom.findById(classroomId)
      .select('students')
      .lean();
    if (!classroom) {
      return NextResponse.json({ message: 'Classroom not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentIds = (classroom as any).students || [];

    const leaderboard = await VersusStats.find({
      userId: { $in: studentIds },
      totalChallenges: { $gt: 0 },
    })
      .sort({ rating: -1 })
      .limit(limit)
      .populate('userId', 'name username profilePicture')
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = leaderboard.map((entry: any, index: number) => ({
      rank: index + 1,
      userId: entry.userId?._id || entry.userId,
      userName: entry.userId?.username || entry.userId?.name || 'Unknown',
      userAvatar: entry.userId?.profilePicture || null,
      rating: entry.rating,
      wins: entry.wins,
      losses: entry.losses,
      draws: entry.draws,
      highestScore: entry.highestCompositeScore,
      totalChallenges: entry.totalChallenges,
    }));

    return NextResponse.json({ leaderboard: entries, type });
  }

  return NextResponse.json({ message: 'Invalid leaderboard type' }, { status: 400 });
}
