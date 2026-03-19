import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Challenge } from '@/models/Challenge';

export async function GET(request: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
  const sort = searchParams.get('sort') || 'recent'; // 'recent' | 'popular' | 'top-score'
  const period = searchParams.get('period') || 'all'; // 'all' | 'week' | 'month'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {
    scope: 'public',
    status: 'completed',
  };

  if (period === 'week') {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    filter.updatedAt = { $gte: since };
  } else if (period === 'month') {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    filter.updatedAt = { $gte: since };
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    recent: { updatedAt: -1 },
    popular: { 'participants': -1, updatedAt: -1 },
    'top-score': { updatedAt: -1 },
  };
  const sortQuery = sortMap[sort] || sortMap.recent;

  const [challenges, total] = await Promise.all([
    Challenge.find(filter)
      .sort(sortQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('challengeCode setName flashcardSetId studyMode studyDirection cardCount participants status updatedAt createdAt maxParticipants scope')
      .lean(),
    Challenge.countDocuments(filter),
  ]);

  // Compute summary fields per challenge
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = (challenges as any[]).map((ch) => {
    const completed = (ch.participants || []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.status === 'completed',
    );
    const topScore = completed.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (max: number, p: any) => Math.max(max, p.compositeScore ?? 0),
      0,
    );
    const winner = completed.sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0),
    )[0];

    return {
      _id: ch._id.toString(),
      challengeCode: ch.challengeCode,
      setName: ch.setName,
      flashcardSetId: ch.flashcardSetId?.toString(),
      studyMode: ch.studyMode,
      studyDirection: ch.studyDirection,
      cardCount: ch.cardCount,
      scope: ch.scope,
      participantCount: (ch.participants || []).length,
      completedCount: completed.length,
      maxParticipants: ch.maxParticipants,
      topScore,
      winnerName: winner?.userName ?? null,
      completedAt: ch.updatedAt?.toISOString() ?? ch.createdAt?.toISOString() ?? null,
    };
  });

  // Sort by top-score post-compute if needed
  if (sort === 'top-score') {
    enriched.sort((a, b) => b.topScore - a.topScore);
  } else if (sort === 'popular') {
    enriched.sort((a, b) => b.participantCount - a.participantCount);
  }

  return NextResponse.json(
    { challenges: enriched, total, page, limit, totalPages: Math.ceil(total / limit) },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
