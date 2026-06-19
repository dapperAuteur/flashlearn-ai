import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { withApiAuth, apiSuccess } from '@/lib/api/withApiAuth';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { ExternalStudentCardState } from '@/models/ExternalStudentCardState';
import { FlashcardSet } from '@/models/FlashcardSet';
import { User } from '@/models/User';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  await dbConnect();

  const filterSetId = request.nextUrl.searchParams.get('setId');
  const now = new Date();

  // Per-student due cards (partner-tracked via /study/external-results).
  const externalStudentId = request.nextUrl.searchParams.get('externalStudentId')?.trim();
  if (externalStudentId) {
    const match: Record<string, unknown> = {
      apiKeyId: context.apiKey._id,
      externalStudentId,
      nextReviewDate: { $lte: now },
    };
    if (filterSetId) match.setId = new mongoose.Types.ObjectId(filterSetId);

    const dueStates = await ExternalStudentCardState.find(match)
      .select('setId cardId')
      .lean<Array<{ setId: { toString(): string }; cardId: { toString(): string } }>>();

    const bySet = new Map<string, string[]>();
    for (const s of dueStates) {
      const key = s.setId.toString();
      if (!bySet.has(key)) bySet.set(key, []);
      bySet.get(key)!.push(s.cardId.toString());
    }

    const setIds = [...bySet.keys()].map((id) => new mongoose.Types.ObjectId(id));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const namedSets: any[] = await FlashcardSet.find({ _id: { $in: setIds } }).select('title').lean();
    const nameMap = new Map(namedSets.map((s) => [s._id.toString(), s.title]));

    const sets = [...bySet.entries()]
      .filter(([id]) => nameMap.has(id))
      .map(([id, dueCardIds]) => ({ setId: id, setName: nameMap.get(id)!, dueCount: dueCardIds.length, dueCardIds }));

    return apiSuccess({ sets, totalDue: sets.reduce((sum, s) => sum + s.dueCount, 0) }, { requestId });
  }

  const userId = new mongoose.Types.ObjectId(String(context.user._id));

  const user = await User.findById(userId).select('profiles').lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileId = (user as any)?.profiles?.[0];
  if (!profileId) {
    return apiSuccess({ sets: [], totalDue: 0 }, { requestId });
  }

  const matchStage: Record<string, unknown> = { profile: profileId };
  if (filterSetId) matchStage.set = new mongoose.Types.ObjectId(filterSetId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analytics: any[] = await StudyAnalytics.find(matchStage).lean();

  const setsWithDue: { setId: string; dueCount: number; dueCardIds: string[] }[] = [];
  for (const doc of analytics) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dueCards = (doc.cardPerformance || []).filter((cp: any) => {
      if (cp.mlData?.nextReviewDate && new Date(cp.mlData.nextReviewDate) <= now) return true;
      if (cp.modePerformance?.some((mp: { mlData?: { nextReviewDate?: Date } }) =>
        mp.mlData?.nextReviewDate && new Date(mp.mlData.nextReviewDate) <= now)) return true;
      return false;
    });
    if (dueCards.length > 0) {
      setsWithDue.push({
        setId: doc.set.toString(),
        dueCount: dueCards.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dueCardIds: dueCards.map((c: any) => c.cardId.toString()),
      });
    }
  }

  const setIds = setsWithDue.map(s => new mongoose.Types.ObjectId(s.setId));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sets: any[] = await FlashcardSet.find({ _id: { $in: setIds } }).select('title').lean();
  const setNameMap = new Map(sets.map(s => [s._id.toString(), s.title]));

  const enriched = setsWithDue
    .filter(s => setNameMap.has(s.setId))
    .map(s => ({ setId: s.setId, setName: setNameMap.get(s.setId)!, dueCount: s.dueCount, dueCardIds: s.dueCardIds }));

  return apiSuccess({ sets: enriched, totalDue: enriched.reduce((sum, s) => sum + s.dueCount, 0) }, { requestId });
}

export const GET = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app', 'ecosystem'],
  requiredPermission: 'study:read',
});
