import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { StudySession } from '@/models/StudySession';
import { FlashcardSet } from '@/models/FlashcardSet';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const userId = new mongoose.Types.ObjectId(session.user.id);

  const [sessions, total] = await Promise.all([
    StudySession.find({ userId, status: 'completed' })
      .sort({ startTime: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    StudySession.countDocuments({ userId, status: 'completed' }),
  ]);

  // Collect unique set IDs and fetch names
  const setIds = [...new Set(sessions.map((s) => s.listId.toString()))];
  const sets = await FlashcardSet.find({
    _id: { $in: setIds.map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .select('title')
    .lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setNameMap = new Map(sets.map((s: any) => [s._id.toString(), s.title]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedSessions = sessions.map((s: any) => ({
    sessionId: s.sessionId,
    setId: s.listId.toString(),
    setName: setNameMap.get(s.listId.toString()) || 'Unknown Set',
    startTime: s.startTime,
    endTime: s.endTime,
    totalCards: s.totalCards,
    correctCount: s.correctCount,
    incorrectCount: s.incorrectCount,
    accuracy:
      s.correctCount + s.incorrectCount > 0
        ? Math.round(
            (s.correctCount / (s.correctCount + s.incorrectCount)) * 100,
          )
        : 0,
    studyDirection: s.studyDirection || 'front-to-back',
  }));

  const response = NextResponse.json({
    sessions: enrichedSessions,
    total,
    hasMore: offset + limit < total,
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
