/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { withApiAuth, apiSuccess } from '@/lib/api/withApiAuth';
import { VersusStats } from '@/models/VersusStats';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/** GET /api/v1/versus/stats — Get user's versus statistics */
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  await dbConnect();

  const userId = new mongoose.Types.ObjectId(String(context.user._id));
  const stats: any = await VersusStats.findOne({ userId }).lean();

  if (!stats) {
    return apiSuccess({
      stats: {
        totalChallenges: 0, wins: 0, losses: 0, draws: 0,
        currentWinStreak: 0, bestWinStreak: 0,
        averageCompositeScore: 0, highestCompositeScore: 0, rating: 1000,
      },
    }, { requestId });
  }

  return apiSuccess({
    stats: {
      totalChallenges: stats.totalChallenges || 0,
      wins: stats.wins || 0,
      losses: stats.losses || 0,
      draws: stats.draws || 0,
      currentWinStreak: stats.currentWinStreak || 0,
      bestWinStreak: stats.bestWinStreak || 0,
      averageCompositeScore: stats.averageCompositeScore || 0,
      highestCompositeScore: stats.highestCompositeScore || 0,
      rating: stats.rating || 1000,
    },
  }, { requestId });
}

export const GET = withApiAuth(handler, { allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'], requiredPermission: 'versus:read' });
