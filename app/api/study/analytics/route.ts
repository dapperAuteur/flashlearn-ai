/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { StudySession } from '@/models/StudySession';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { User } from '@/models/User';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = new mongoose.Types.ObjectId(session.user.id);

  try {
    await dbConnect();

    // 1. Weekly accuracy over last 12 weeks
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const weeklyAccuracy = await StudySession.aggregate([
      {
        $match: {
          userId,
          status: 'completed',
          startTime: { $gte: twelveWeeksAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$startTime' },
            week: { $isoWeek: '$startTime' },
          },
          totalCorrect: { $sum: '$correctCount' },
          totalIncorrect: { $sum: '$incorrectCount' },
          sessions: { $sum: 1 },
          totalTime: { $sum: { $subtract: ['$endTime', '$startTime'] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]);

    const weeklyData = weeklyAccuracy.map((w) => {
      const total = w.totalCorrect + w.totalIncorrect;
      return {
        week: `W${w._id.week}`,
        year: w._id.year,
        accuracy: total > 0 ? Math.round((w.totalCorrect / total) * 100) : 0,
        sessions: w.sessions,
        timeMinutes: Math.round((w.totalTime || 0) / 60000),
      };
    });

    // 2. Study streak calendar (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const dailySessions = await StudySession.aggregate([
      {
        $match: {
          userId,
          status: 'completed',
          startTime: { $gte: ninetyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$startTime' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const streakCalendar = dailySessions.map((d) => ({
      date: d._id,
      count: d.count,
    }));

    // 3. Problem cards (lowest accuracy) - need user profiles
    const user = await User.findById(userId).select('profiles').lean();
    const profileIds = (user as any)?.profiles || [];

    let problemCards: { cardId: string; correct: number; incorrect: number; accuracy: number }[] = [];

    if (profileIds.length > 0) {
      const analytics = await StudyAnalytics.find({
        profile: { $in: profileIds },
      })
        .select('cardPerformance')
        .lean();

      const allCards: { cardId: string; correct: number; incorrect: number; accuracy: number }[] = [];
      for (const a of analytics) {
        const perf = (a as any).cardPerformance || [];
        for (const p of perf) {
          const total = p.correctCount + p.incorrectCount;
          if (total >= 2) {
            allCards.push({
              cardId: p.cardId.toString(),
              correct: p.correctCount,
              incorrect: p.incorrectCount,
              accuracy: Math.round((p.correctCount / total) * 100),
            });
          }
        }
      }

      // Sort by accuracy ascending, take top 10 worst
      allCards.sort((a, b) => a.accuracy - b.accuracy);
      problemCards = allCards.slice(0, 10);
    }

    // 4. Confidence vs accuracy data
    let confidenceAccuracy: { confidence: number; accuracy: number; count: number }[] = [];

    if (profileIds.length > 0) {
      const analytics = await StudyAnalytics.find({
        profile: { $in: profileIds },
      })
        .select('cardPerformance.confidenceData cardPerformance.correctCount cardPerformance.incorrectCount')
        .lean();

      const byConfidence = new Map<number, { correct: number; total: number }>();

      for (const a of analytics) {
        const perf = (a as any).cardPerformance || [];
        for (const p of perf) {
          const dist = p.confidenceData?.confidenceDistribution;
          if (!dist) continue;
          for (let level = 1; level <= 5; level++) {
            const key = `level${level}` as keyof typeof dist;
            const count = (dist[key] as number) || 0;
            if (count > 0) {
              const entry = byConfidence.get(level) || { correct: 0, total: 0 };
              const totalAttempts = p.correctCount + p.incorrectCount;
              if (totalAttempts > 0) {
                entry.correct += p.correctCount;
                entry.total += totalAttempts;
              }
              byConfidence.set(level, entry);
            }
          }
        }
      }

      confidenceAccuracy = Array.from(byConfidence.entries())
        .map(([confidence, data]) => ({
          confidence,
          accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
          count: data.total,
        }))
        .sort((a, b) => a.confidence - b.confidence);
    }

    // 5. Daily study time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTime = await StudySession.aggregate([
      {
        $match: {
          userId,
          status: 'completed',
          startTime: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$startTime' },
          },
          totalTimeMs: { $sum: { $subtract: ['$endTime', '$startTime'] } },
          sessions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyStudyTime = dailyTime.map((d) => ({
      date: d._id,
      minutes: Math.round((d.totalTimeMs || 0) / 60000),
      sessions: d.sessions,
    }));

    return NextResponse.json({
      weeklyData,
      streakCalendar,
      problemCards,
      confidenceAccuracy,
      dailyStudyTime,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
