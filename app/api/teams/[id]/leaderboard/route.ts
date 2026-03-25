/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Team } from '@/models/Team';
import { User } from '@/models/User';
import { VersusStats } from '@/models/VersusStats';
import { StudySession } from '@/models/StudySession';

interface Params {
  params: Promise<{ id: string }>;
}

// GET - Get team member leaderboard
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await dbConnect();

    const team = await Team.findById(id).select('members').lean() as any;
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify the user is a member
    const isMember = team.members.some(
      (m: any) => m.userId.toString() === session.user.id,
    );

    if (!isMember && session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const memberIds = team.members.map(
      (m: any) => m.userId.toString(),
    );

    // Fetch user info, versus stats, and study session counts in parallel
    const [users, versusStats, sessionCounts] = await Promise.all([
      User.find({ _id: { $in: memberIds } })
        .select('name username profilePicture')
        .lean(),
      VersusStats.find({ userId: { $in: memberIds } })
        .select('userId wins rating')
        .lean(),
      StudySession.aggregate([
        { $match: { userId: { $in: memberIds }, status: 'completed' } },
        { $group: { _id: '$userId', sessionCount: { $sum: 1 } } },
      ]),
    ]);

    // Build lookup maps
    const statsMap = new Map(
      (versusStats as any[]).map((s) => [
        s.userId.toString(),
        { wins: s.wins, rating: s.rating },
      ]),
    );

    const sessionMap = new Map(
      (sessionCounts as any[]).map((s) => [
        s._id.toString(),
        s.sessionCount,
      ]),
    );

    // Build leaderboard entries
    const leaderboard = (users as any[])
      .map((user) => {
        const uid = user._id.toString();
        const stats = statsMap.get(uid) || { wins: 0, rating: 1000 };
        return {
          userId: uid,
          name: user.name,
          username: user.username,
          profilePicture: user.profilePicture,
          wins: stats.wins,
          rating: stats.rating,
          studySessions: sessionMap.get(uid) || 0,
        };
      })
      .sort((a: any, b: any) => b.rating - a.rating);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching team leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
