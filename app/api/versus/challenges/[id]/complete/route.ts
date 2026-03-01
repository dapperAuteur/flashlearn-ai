import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { Challenge } from '@/models/Challenge';
import { CardResult } from '@/models/CardResult';
import { VersusStats } from '@/models/VersusStats';
import { StudySession } from '@/models/StudySession';
import { calculateCompositeScore, CardAnswer } from '@/lib/algorithms/compositeScore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;
  const userId = session.user.id;

  const challenge = await Challenge.findById(id);
  if (!challenge) {
    return NextResponse.json({ message: 'Challenge not found' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participant = challenge.participants.find(
    (p: any) => p.userId.toString() === userId,
  );
  if (!participant) {
    return NextResponse.json({ message: 'You are not a participant' }, { status: 403 });
  }

  if (participant.status === 'completed') {
    return NextResponse.json({ message: 'Already completed' }, { status: 400 });
  }

  if (!participant.sessionId) {
    return NextResponse.json({ message: 'No session found. Play the challenge first.' }, { status: 400 });
  }

  // Fetch card results for this session
  const cardResults = await CardResult.find({
    sessionId: participant.sessionId,
  }).lean();

  if (cardResults.length === 0) {
    return NextResponse.json({ message: 'No card results found' }, { status: 400 });
  }

  // Calculate composite score
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const answers: CardAnswer[] = cardResults.map((r: any) => ({
    isCorrect: r.isCorrect,
    timeSeconds: r.timeSeconds || 10,
    confidenceRating: r.confidenceRating || 3,
  }));

  const scoreResult = calculateCompositeScore(answers, challenge.cardCount);

  // Update participant
  participant.compositeScore = scoreResult.totalScore;
  participant.status = 'completed';
  participant.completedAt = new Date();

  // Check if all participants have completed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCompleted = challenge.participants.every(
    (p: any) => p.status === 'completed' || p.status === 'declined',
  );

  if (allCompleted) {
    // Rank participants by score
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completed = challenge.participants
      .filter((p: any) => p.status === 'completed')
      .sort((a: any, b: any) => (b.compositeScore || 0) - (a.compositeScore || 0));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    completed.forEach((p: any, index: number) => {
      p.rank = index + 1;
    });

    challenge.status = 'completed';

    // Update VersusStats for all completed participants
    for (const p of completed) {
      const isWinner = p.rank === 1;
      const isDraw = completed.length > 1 &&
        completed[0].compositeScore === p.compositeScore;

      await VersusStats.findOneAndUpdate(
        { userId: p.userId },
        {
          $inc: {
            totalChallenges: 1,
            wins: isDraw ? 0 : isWinner ? 1 : 0,
            losses: isDraw ? 0 : isWinner ? 0 : 1,
            draws: isDraw ? 1 : 0,
            totalCompositeScore: p.compositeScore || 0,
          },
          $max: {
            highestCompositeScore: p.compositeScore || 0,
          },
          $set: {
            currentWinStreak: isDraw ? 0 : isWinner ? undefined : 0,
          },
        },
        { upsert: true },
      );

      // Update win streak separately for winners
      if (isWinner && !isDraw) {
        const stats = await VersusStats.findOne({ userId: p.userId });
        if (stats) {
          stats.currentWinStreak += 1;
          stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.currentWinStreak);
          stats.averageCompositeScore = stats.totalCompositeScore / stats.totalChallenges;
          await stats.save();
        }
      }
    }
  }

  await challenge.save();

  // Mark study session as completed
  await StudySession.findOneAndUpdate(
    { sessionId: participant.sessionId },
    {
      status: 'completed',
      endTime: new Date(),
      correctCount: answers.filter((a) => a.isCorrect).length,
      incorrectCount: answers.filter((a) => !a.isCorrect).length,
      completedCards: answers.length,
    },
  );

  return NextResponse.json({
    compositeScore: scoreResult,
    challenge,
  });
}
