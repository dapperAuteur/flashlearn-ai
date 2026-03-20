import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { withApiAuth, apiSuccess } from '@/lib/api/withApiAuth';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { User } from '@/models/User';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  await dbConnect();

  const userId = new mongoose.Types.ObjectId(String(context.user._id));
  const user = await User.findById(userId).select('profiles').lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileId = (user as any)?.profiles?.[0];
  if (!profileId) {
    return apiSuccess({ today: 0, tomorrow: 0, thisWeek: 0, next14Days: [] }, { requestId });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analytics: any[] = await StudyAnalytics.find({ profile: profileId }).lean();

  const now = new Date();
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);

  let today = 0, tomorrowCount = 0, thisWeek = 0;
  const dailyBreakdown: Record<string, number> = {};

  for (let i = 0; i < 14; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i);
    dailyBreakdown[d.toISOString().slice(0, 10)] = 0;
  }

  for (const doc of analytics) {
    for (const cp of doc.cardPerformance || []) {
      const reviewDate = cp.mlData?.nextReviewDate ? new Date(cp.mlData.nextReviewDate) : null;
      if (!reviewDate) continue;
      if (reviewDate <= endOfToday) today++;
      else if (reviewDate <= tomorrow) tomorrowCount++;
      if (reviewDate <= weekEnd) thisWeek++;
      const dayKey = reviewDate.toISOString().slice(0, 10);
      if (dayKey in dailyBreakdown) dailyBreakdown[dayKey]++;
    }
  }

  return apiSuccess({
    today, tomorrow: tomorrowCount, thisWeek,
    next14Days: Object.entries(dailyBreakdown).map(([date, count]) => ({ date, count })),
  }, { requestId });
}

export const GET = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'study:read',
});
