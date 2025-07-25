// app/api/study/sessions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/db/mongodb';
import { authOptions } from '@/lib/auth/auth';
import { Logger, LogContext } from '@/lib/logging/logger';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const params = await context;
  const requestId = await Logger.info(LogContext.STUDY, "Get study session details request", { sessionIdFromParams: params?.id });
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      await Logger.warn(LogContext.STUDY, "Unauthorized attempt to get study session", { requestId });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = params?.id;
    if (!ObjectId.isValid(sessionId)) {
      await Logger.warn(LogContext.STUDY, "Invalid session ID format for get study session", { requestId, sessionId });
      return NextResponse.json({ error: "Invalid session ID format" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const studySession = await db.collection('studySessions').findOne({
      _id: new ObjectId(sessionId),
      userId: new ObjectId(session.user.id)
    });

    if (!studySession) {
      await Logger.warn(LogContext.STUDY, "Study session not found or access denied for get", { requestId, sessionId, userId: session.user.id });
      return NextResponse.json({ error: "Study session not found or access denied" }, { status: 404 });
    }

    if (!studySession.listId || !ObjectId.isValid(studySession.listId.toString())) {
        await Logger.error(LogContext.STUDY, "Study session missing valid listId", { requestId, sessionId: studySession._id.toString() });
        return NextResponse.json({ error: "Study session is incomplete (missing listId)" }, { status: 500 });
    }

    const flashcards = await db.collection('flashcards').find({
      listId: new ObjectId(studySession.listId)
    }).project({ front: 1, back: 1, frontImage: 1, backImage: 1 }).toArray(); // Ensure projection if needed

    const formattedFlashcards = flashcards.map(fc => ({
      id: fc._id.toString(),
      front: fc.front,
      back: fc.back,
      frontImage: fc.frontImage,
      backImage: fc.backImage,
    }));

    await Logger.debug(LogContext.STUDY, "Study session details retrieved successfully", {
      requestId,
      sessionId: studySession._id.toString(),
      flashcardCount: formattedFlashcards.length
    });

    return NextResponse.json({
      sessionId: studySession._id.toString(),
      listId: studySession.listId.toString(),
      flashcards: formattedFlashcards,
      ...studySession // spread other relevant fields from studySession
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(LogContext.STUDY, `Error fetching study session: ${errorMessage}`, { requestId, error });
    return NextResponse.json({ error: "Failed to fetch study session" }, { status: 500 });
  }
}