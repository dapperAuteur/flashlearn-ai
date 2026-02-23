/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Achievement } from '@/models/Achievement';
import { StudySession } from '@/models/StudySession';

const ACHIEVEMENT_DEFS: Record<string, { title: string; description: string; icon: string }> = {
  first_session: { title: 'First Steps', description: 'Completed your first study session', icon: 'rocket' },
  streak_7: { title: 'Week Warrior', description: 'Studied 7 days in a row', icon: 'fire' },
  streak_30: { title: 'Monthly Master', description: 'Studied 30 days in a row', icon: 'star' },
  perfect_score: { title: 'Perfect Score', description: '100% accuracy on a study session', icon: 'trophy' },
  sessions_10: { title: 'Getting Started', description: 'Completed 10 study sessions', icon: 'book' },
  sessions_50: { title: 'Dedicated Learner', description: 'Completed 50 study sessions', icon: 'academic' },
  sessions_100: { title: 'Study Champion', description: 'Completed 100 study sessions', icon: 'crown' },
  cards_studied_100: { title: 'Card Collector', description: 'Studied 100 cards', icon: 'cards' },
  cards_studied_500: { title: 'Card Master', description: 'Studied 500 cards', icon: 'sparkles' },
};

// GET - List user achievements
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const achievements = await Achievement.find({
      userId: new mongoose.Types.ObjectId(session.user.id),
    })
      .sort({ earnedAt: -1 })
      .lean();

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }
}

// POST - Check and award new achievements after a session
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = new mongoose.Types.ObjectId(session.user.id);

  try {
    await dbConnect();

    const existingAchievements = await Achievement.find({ userId }).select('type').lean();
    const earnedTypes = new Set(existingAchievements.map((a: any) => a.type));

    const newAchievements: { type: string; title: string; description: string; icon: string }[] = [];

    // Count total completed sessions
    const totalSessions = await StudySession.countDocuments({ userId, status: 'completed' });

    // Count total cards studied
    const cardsAgg = await StudySession.aggregate([
      { $match: { userId, status: 'completed' } },
      { $group: { _id: null, totalCards: { $sum: '$completedCards' } } },
    ]);
    const totalCards = cardsAgg[0]?.totalCards || 0;

    // Check for perfect score (most recent session)
    const latestSession = await StudySession.findOne({ userId, status: 'completed' })
      .sort({ startTime: -1 })
      .lean();

    // First session
    if (!earnedTypes.has('first_session') && totalSessions >= 1) {
      newAchievements.push({ type: 'first_session', ...ACHIEVEMENT_DEFS.first_session });
    }

    // Session milestones
    if (!earnedTypes.has('sessions_10') && totalSessions >= 10) {
      newAchievements.push({ type: 'sessions_10', ...ACHIEVEMENT_DEFS.sessions_10 });
    }
    if (!earnedTypes.has('sessions_50') && totalSessions >= 50) {
      newAchievements.push({ type: 'sessions_50', ...ACHIEVEMENT_DEFS.sessions_50 });
    }
    if (!earnedTypes.has('sessions_100') && totalSessions >= 100) {
      newAchievements.push({ type: 'sessions_100', ...ACHIEVEMENT_DEFS.sessions_100 });
    }

    // Card milestones
    if (!earnedTypes.has('cards_studied_100') && totalCards >= 100) {
      newAchievements.push({ type: 'cards_studied_100', ...ACHIEVEMENT_DEFS.cards_studied_100 });
    }
    if (!earnedTypes.has('cards_studied_500') && totalCards >= 500) {
      newAchievements.push({ type: 'cards_studied_500', ...ACHIEVEMENT_DEFS.cards_studied_500 });
    }

    // Perfect score
    const latest = latestSession as any;
    if (
      !earnedTypes.has('perfect_score') &&
      latest &&
      latest.correctCount > 0 &&
      latest.correctCount === latest.totalCards
    ) {
      newAchievements.push({ type: 'perfect_score', ...ACHIEVEMENT_DEFS.perfect_score });
    }

    // Streak check
    if (!earnedTypes.has('streak_7') || !earnedTypes.has('streak_30')) {
      const streak = await calculateStreak(userId);
      if (!earnedTypes.has('streak_7') && streak >= 7) {
        newAchievements.push({ type: 'streak_7', ...ACHIEVEMENT_DEFS.streak_7 });
      }
      if (!earnedTypes.has('streak_30') && streak >= 30) {
        newAchievements.push({ type: 'streak_30', ...ACHIEVEMENT_DEFS.streak_30 });
      }
    }

    // Save new achievements
    if (newAchievements.length > 0) {
      await Achievement.insertMany(
        newAchievements.map((a) => ({ userId, ...a })),
        { ordered: false },
      ).catch(() => {
        // Ignore duplicate key errors
      });
    }

    return NextResponse.json({ newAchievements });
  } catch (error) {
    console.error('Error checking achievements:', error);
    return NextResponse.json({ error: 'Failed to check achievements' }, { status: 500 });
  }
}

async function calculateStreak(userId: mongoose.Types.ObjectId): Promise<number> {
  const days = await StudySession.aggregate([
    { $match: { userId, status: 'completed' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  if (days.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  const dates = days.map((d) => d._id);

  // Streak must include today or yesterday
  if (dates[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dates[0] !== yesterday.toISOString().split('T')[0]) {
      return 0;
    }
  }

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
