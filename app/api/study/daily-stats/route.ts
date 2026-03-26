import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { StudySession } from '@/models/StudySession';
import mongoose from 'mongoose';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Today's start (UTC midnight)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Cards studied today
    const todaySessions = await StudySession.find({
      userId,
      status: 'completed',
      createdAt: { $gte: todayStart },
    })
      .select('completedCards')
      .lean();

    const cardsStudiedToday = todaySessions.reduce(
      (sum, s) => sum + (s.completedCards || 0),
      0
    );

    // Calculate streak: count consecutive days with at least 1 completed session
    let currentStreak = 0;
    const checkDate = new Date(todayStart);

    // Check if user studied today first
    if (todaySessions.length > 0) {
      currentStreak = 1;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    // Walk backwards day by day
    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      const hasSession = await StudySession.exists({
        userId,
        status: 'completed',
        createdAt: { $gte: dayStart, $lt: dayEnd },
      });

      if (hasSession) {
        currentStreak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    }

    return NextResponse.json({
      cardsStudiedToday,
      currentStreak,
      todaySessions: todaySessions.length,
    });
  } catch (error) {
    console.error('[study/daily-stats] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
