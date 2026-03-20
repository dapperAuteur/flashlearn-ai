import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { User } from '@/models/User';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * GET /api/v1/study/analytics/[setId]
 * Get SM-2 spaced repetition analytics for a specific flashcard set.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  const setId = request.nextUrl.pathname.split('/').pop();
  if (!setId) return apiError('INVALID_INPUT', requestId, undefined, 'Set ID is required.');

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(String(context.user._id));
  const user = await User.findById(userId).select('profiles').lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileId = (user as any)?.profiles?.[0];
  if (!profileId) return apiSuccess({ analytics: null }, { requestId });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analytics: any = await StudyAnalytics.findOne({
    profile: profileId,
    set: new mongoose.Types.ObjectId(setId),
  }).lean();

  if (!analytics) return apiSuccess({ analytics: null }, { requestId });

  return apiSuccess({
    analytics: {
      setId: analytics.set.toString(),
      setPerformance: analytics.setPerformance || {},
      cards: (analytics.cardPerformance || []).map((cp: {
        cardId: { toString: () => string };
        correctCount: number;
        incorrectCount: number;
        totalTimeStudied: number;
        mlData: { easinessFactor: number; interval: number; repetitions: number; nextReviewDate: Date };
        confidenceData: unknown;
      }) => ({
        cardId: cp.cardId.toString(),
        correctCount: cp.correctCount || 0,
        incorrectCount: cp.incorrectCount || 0,
        totalTimeStudied: cp.totalTimeStudied || 0,
        sm2: {
          easinessFactor: cp.mlData?.easinessFactor ?? 2.5,
          interval: cp.mlData?.interval ?? 0,
          repetitions: cp.mlData?.repetitions ?? 0,
          nextReviewDate: cp.mlData?.nextReviewDate || null,
        },
        confidence: cp.confidenceData || null,
      })),
    },
  }, { requestId });
}

export const GET = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'study:read',
});
