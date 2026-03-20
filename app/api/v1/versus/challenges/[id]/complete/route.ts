/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { Challenge } from '@/models/Challenge';
import { CardResult } from '@/models/CardResult';
import { VersusStats } from '@/models/VersusStats';
import { StudySession } from '@/models/StudySession';
import { calculateCompositeScore, CardAnswer } from '@/lib/algorithms/compositeScore';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/** POST /api/v1/versus/challenges/[id]/complete — Complete challenge and get score */
async function handler(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  const pathParts = request.nextUrl.pathname.split('/');
  const id = pathParts[pathParts.indexOf('challenges') + 1];

  await dbConnect();
  const userId = String(context.user._id);

  const challenge = await Challenge.findById(id);
  if (!challenge) return apiError('NOT_FOUND', requestId, undefined, 'Challenge not found.');

  const participant = challenge.participants.find((p: any) => p.userId.toString() === userId);
  if (!participant) return apiError('FORBIDDEN', requestId, undefined, 'Not a participant.');
  if (participant.status === 'completed') return apiError('INVALID_INPUT', requestId, undefined, 'Already completed.');
  if (!participant.sessionId) return apiError('INVALID_INPUT', requestId, undefined, 'Play the challenge first.');

  const cardResults = await CardResult.find({ sessionId: participant.sessionId }).lean();
  if (cardResults.length === 0) return apiError('INVALID_INPUT', requestId, undefined, 'No card results found.');

  const answers: CardAnswer[] = cardResults.map((r: any) => ({
    isCorrect: r.isCorrect, timeSeconds: r.timeSeconds || 10, confidenceRating: r.confidenceRating || 3,
  }));

  const scoreResult = calculateCompositeScore(answers, challenge.cardCount);

  participant.compositeScore = scoreResult.totalScore;
  participant.scoreBreakdown = {
    accuracyScore: scoreResult.accuracyScore, speedScore: scoreResult.speedScore,
    confidenceScore: scoreResult.confidenceScore, streakScore: scoreResult.streakScore,
    accuracy: scoreResult.accuracy, averageTimeSeconds: scoreResult.averageTimeSeconds,
    longestStreak: scoreResult.longestStreak,
  };
  participant.status = 'completed';
  participant.completedAt = new Date();

  const allCompleted = challenge.participants.every((p: any) => p.status === 'completed' || p.status === 'declined');
  if (allCompleted) {
    const completed = challenge.participants.filter((p: any) => p.status === 'completed')
      .sort((a: any, b: any) => (b.compositeScore || 0) - (a.compositeScore || 0));
    completed.forEach((p: any, i: number) => { p.rank = i + 1; });
    challenge.status = 'completed';

    for (const p of completed) {
      const isWinner = p.rank === 1;
      const isDraw = completed.length > 1 && completed[0].compositeScore === p.compositeScore;
      await VersusStats.findOneAndUpdate({ userId: p.userId }, {
        $inc: { totalChallenges: 1, wins: isDraw ? 0 : isWinner ? 1 : 0, losses: isDraw ? 0 : isWinner ? 0 : 1, draws: isDraw ? 1 : 0, totalCompositeScore: p.compositeScore || 0 },
        $max: { highestCompositeScore: p.compositeScore || 0 },
      }, { upsert: true });
      if (isWinner && !isDraw) {
        const stats = await VersusStats.findOne({ userId: p.userId });
        if (stats) { stats.currentWinStreak += 1; stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.currentWinStreak); stats.averageCompositeScore = stats.totalCompositeScore / stats.totalChallenges; await stats.save(); }
      }
    }
  }

  await challenge.save();
  await StudySession.findOneAndUpdate({ sessionId: participant.sessionId }, {
    status: 'completed', endTime: new Date(),
    correctCount: answers.filter(a => a.isCorrect).length, incorrectCount: answers.filter(a => !a.isCorrect).length,
    completedCards: answers.length,
  });

  return apiSuccess({
    compositeScore: scoreResult,
    rank: participant.rank || null,
    challengeStatus: challenge.status,
  }, { requestId });
}

export const POST = withApiAuth(handler, { allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'], requiredPermission: 'versus:write' });
