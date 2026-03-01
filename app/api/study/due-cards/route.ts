import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { FlashcardSet } from '@/models/FlashcardSet';
import { User } from '@/models/User';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(session.user.id);
  const { searchParams } = new URL(request.url);
  const filterSetId = searchParams.get('setId');

  // Get user's profile
  const user = await User.findById(userId).select('profiles').lean();
  const profileId = (user as { profiles?: mongoose.Types.ObjectId[] })?.profiles?.[0];

  if (!profileId) {
    return NextResponse.json({ sets: [], totalDue: 0 });
  }

  const now = new Date();

  // Build match stage
  const matchStage: Record<string, unknown> = { profile: profileId };
  if (filterSetId) {
    matchStage.set = new mongoose.Types.ObjectId(filterSetId);
  }

  // Find analytics docs with cards due for review
  const analytics = await StudyAnalytics.find(matchStage).lean();

  const setsWithDue: { setId: string; dueCount: number; dueCardIds: string[] }[] = [];

  for (const doc of analytics) {
    const dueCards = (doc.cardPerformance || []).filter(
      (cp: { mlData?: { nextReviewDate?: Date } }) =>
        cp.mlData?.nextReviewDate && new Date(cp.mlData.nextReviewDate) <= now,
    );

    if (dueCards.length > 0) {
      setsWithDue.push({
        setId: doc.set.toString(),
        dueCount: dueCards.length,
        dueCardIds: dueCards.map((c: { cardId: { toString: () => string } }) => c.cardId.toString()),
      });
    }
  }

  // Fetch set names
  const setIds = setsWithDue.map((s) => new mongoose.Types.ObjectId(s.setId));
  const sets = await FlashcardSet.find({ _id: { $in: setIds } })
    .select('title')
    .lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setNameMap = new Map(sets.map((s: any) => [s._id.toString(), s.title]));

  // Filter out sets whose FlashcardSet documents no longer exist (orphaned analytics)
  const orphanedSetIds = setsWithDue
    .filter((s) => !setNameMap.has(s.setId))
    .map((s) => new mongoose.Types.ObjectId(s.setId));

  if (orphanedSetIds.length > 0) {
    StudyAnalytics.deleteMany({ profile: profileId, set: { $in: orphanedSetIds } }).catch(() => {});
  }

  const enriched = setsWithDue
    .filter((s) => setNameMap.has(s.setId))
    .map((s) => ({
      setId: s.setId,
      setName: setNameMap.get(s.setId)!,
      dueCount: s.dueCount,
      dueCardIds: s.dueCardIds,
    }));

  const totalDue = enriched.reduce((sum, s) => sum + s.dueCount, 0);

  return NextResponse.json({ sets: enriched, totalDue });
}
