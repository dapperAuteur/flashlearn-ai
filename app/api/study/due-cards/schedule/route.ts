import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { FlashcardSet } from '@/models/FlashcardSet';
import { User } from '@/models/User';

interface SetDue {
  setId: string;
  setName: string;
  dueCount: number;
}

interface DayCount {
  date: string;
  count: number;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(session.user.id);
  const user = await User.findById(userId).select('profiles').lean();
  const profileId = (user as { profiles?: mongoose.Types.ObjectId[] })?.profiles?.[0];

  if (!profileId) {
    return NextResponse.json({
      today: { count: 0, sets: [] },
      tomorrow: { count: 0, sets: [] },
      thisWeek: { count: 0, sets: [] },
      next14Days: [],
    });
  }

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const startOfTomorrow = new Date(now);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  startOfTomorrow.setHours(0, 0, 0, 0);

  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  endOfWeek.setHours(23, 59, 59, 999);

  const endOf14Days = new Date(now);
  endOf14Days.setDate(endOf14Days.getDate() + 14);
  endOf14Days.setHours(23, 59, 59, 999);

  const analytics = await StudyAnalytics.find({ profile: profileId }).lean();

  // Collect all set IDs for name lookup
  const allSetIds = new Set<string>();

  // Group cards by time bucket and set
  const todaySets = new Map<string, number>();
  const tomorrowSets = new Map<string, number>();
  const weekSets = new Map<string, number>();
  const dailyCounts = new Map<string, number>();

  for (const doc of analytics) {
    const setId = doc.set.toString();
    allSetIds.add(setId);

    for (const cp of doc.cardPerformance || []) {
      const reviewDate = cp.mlData?.nextReviewDate
        ? new Date(cp.mlData.nextReviewDate)
        : null;
      if (!reviewDate) continue;

      // Skip cards far in the future
      if (reviewDate > endOf14Days) continue;

      // Today: due now or later today
      if (reviewDate <= endOfToday) {
        todaySets.set(setId, (todaySets.get(setId) || 0) + 1);
      }

      // Tomorrow
      if (reviewDate > endOfToday && reviewDate <= endOfTomorrow) {
        tomorrowSets.set(setId, (tomorrowSets.get(setId) || 0) + 1);
      }

      // This week (next 7 days, includes today and tomorrow)
      if (reviewDate <= endOfWeek) {
        weekSets.set(setId, (weekSets.get(setId) || 0) + 1);
      }

      // Daily breakdown for 14-day timeline
      const dateKey = reviewDate.toISOString().split('T')[0];
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
    }
  }

  // Fetch set names
  const setObjectIds = Array.from(allSetIds).map(
    (id) => new mongoose.Types.ObjectId(id),
  );
  const sets = await FlashcardSet.find({ _id: { $in: setObjectIds } })
    .select('title')
    .lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setNameMap = new Map(sets.map((s: any) => [s._id.toString(), s.title]));

  // Clean up orphaned analytics (sets that no longer exist)
  const orphanedSetIds = Array.from(allSetIds)
    .filter((id) => !setNameMap.has(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (orphanedSetIds.length > 0) {
    StudyAnalytics.deleteMany({ profile: profileId, set: { $in: orphanedSetIds } }).catch(() => {});
  }

  const buildSetList = (map: Map<string, number>): SetDue[] =>
    Array.from(map.entries())
      .filter(([setId]) => setNameMap.has(setId))
      .map(([setId, dueCount]) => ({
        setId,
        setName: setNameMap.get(setId)!,
        dueCount,
      }))
      .sort((a, b) => b.dueCount - a.dueCount);

  // Build 14-day timeline
  const next14Days: DayCount[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateKey = d.toISOString().split('T')[0];
    next14Days.push({ date: dateKey, count: dailyCounts.get(dateKey) || 0 });
  }

  const todaySetList = buildSetList(todaySets);
  const tomorrowSetList = buildSetList(tomorrowSets);
  const weekSetList = buildSetList(weekSets);

  return NextResponse.json({
    today: {
      count: todaySetList.reduce((sum, s) => sum + s.dueCount, 0),
      sets: todaySetList,
    },
    tomorrow: {
      count: tomorrowSetList.reduce((sum, s) => sum + s.dueCount, 0),
      sets: tomorrowSetList,
    },
    thisWeek: {
      count: weekSetList.reduce((sum, s) => sum + s.dueCount, 0),
      sets: weekSetList,
    },
    next14Days,
  });
}
