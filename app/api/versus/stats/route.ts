import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { VersusStats } from '@/models/VersusStats';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const userId = new mongoose.Types.ObjectId(session.user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stats: any = await VersusStats.findOne({ userId }).lean();

  if (!stats) {
    stats = {
      userId,
      totalChallenges: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentWinStreak: 0,
      bestWinStreak: 0,
      totalCompositeScore: 0,
      highestCompositeScore: 0,
      averageCompositeScore: 0,
      rating: 1000,
      setStats: [],
    };
  }

  return NextResponse.json({ stats });
}
