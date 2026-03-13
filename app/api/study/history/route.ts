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
  const sort = searchParams.get('sort') || 'date_desc';

  const userId = new mongoose.Types.ObjectId(session.user.id);

  const baseMatch = { userId, status: 'completed' };

  let sessions: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const total = await StudySession.countDocuments(baseMatch);

  if (sort === 'accuracy_desc' || sort === 'accuracy_asc') {
    const sortDir = sort === 'accuracy_desc' ? -1 : 1;
    sessions = await StudySession.aggregate([
      { $match: baseMatch },
      { $addFields: { accuracy: { $cond: [{ $gt: [{ $add: ['$correctCount', '$incorrectCount'] }, 0] }, { $divide: ['$correctCount', { $add: ['$correctCount', '$incorrectCount'] }] }, 0] } } },
      { $sort: { accuracy: sortDir } },
      { $skip: offset },
      { $limit: limit },
    ]);
  } else {
    const sortDir = sort === 'date_asc' ? 1 : -1;
    sessions = await StudySession.find(baseMatch)
      .sort({ startTime: sortDir })
      .skip(offset)
      .limit(limit)
      .lean();
  }

  // Collect unique set IDs and fetch names (filter out invalid ObjectIds)
  const setIds = [...new Set(sessions.map((s) => s.listId.toString()))];
  const validSetIds = setIds.filter((id) => {
    try { new mongoose.Types.ObjectId(id); return true; } catch { return false; }
  });
  const sets = validSetIds.length > 0
    ? await FlashcardSet.find({
        _id: { $in: validSetIds.map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select('title')
        .lean()
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setNameMap = new Map(sets.map((s: any) => [s._id.toString(), s.title]));

  // Backfill setName on old sessions that are missing it
  const sessionsToBackfill = sessions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => !s.setName && setNameMap.has(s.listId.toString())
  );
  if (sessionsToBackfill.length > 0) {
    // Fire-and-forget backfill — don't block the response
    Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionsToBackfill.map((s: any) =>
        StudySession.updateOne(
          { _id: s._id },
          { $set: { setName: setNameMap.get(s.listId.toString()) } }
        )
      )
    ).catch(() => { /* ignore backfill errors */ });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedSessions = sessions.map((s: any) => ({
    sessionId: s.sessionId,
    setId: s.listId.toString(),
    setName: setNameMap.get(s.listId.toString()) || s.setName || 'Unknown Set',
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
