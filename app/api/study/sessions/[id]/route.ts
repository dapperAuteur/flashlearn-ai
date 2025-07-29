/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/db/mongodb';
import { authOptions } from '@/lib/auth/auth';
import { Logger, LogContext } from '@/lib/logging/logger';

// Define interfaces based on your database schemas for type safety
interface Flashcard {
  _id: ObjectId;
  front: string;
  back: string;
  // include other flashcard properties if they exist
}

interface FlashcardSet {
  _id: ObjectId;
  flashcards: Flashcard[];
  isPublic: boolean;
  // include other flashcard set properties if they exist
}

interface StudySession {
  _id: ObjectId;
  userId?: ObjectId; // userId can be optional for anonymous sessions
  flashcardSetId?: ObjectId; // Make optional to handle potential data inconsistency
  listId: ObjectId;
  // include other study session properties if they exist
}


/**
 * GET /api/study/sessions/[id]
 * Fetches the flashcards for a specific study session.
 * Allows access to public sets for unauthenticated users.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await context.params;
  const requestId = await Logger.info(LogContext.STUDY, "Get study session details request", {
    metadata: { sessionId }
  });

  try {
    // 1. Get current user session (can be null for anonymous users)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // 2. Validate the incoming sessionId
    if (!ObjectId.isValid(sessionId)) {
        await Logger.warning(LogContext.STUDY, "Invalid sessionId format provided", { requestId, metadata: { sessionId } });
        return NextResponse.json({ error: "Invalid session ID format" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // 3. Find the study session
    const studySession = await db.collection<StudySession>('studySessions').findOne({
      _id: new ObjectId(sessionId),
    });
    console.log('studySessionstudySession :>> ', studySession);

    if (!studySession) {
      await Logger.warning(LogContext.STUDY, "Study session not found", {
        requestId,
        metadata: { sessionId }
      });
      return NextResponse.json({ error: "Study session not found" }, { status: 404 });
    }

    // 3a. FIX: Add a guard to ensure flashcardSetId exists before use.
    // This prevents the TypeError if the study session data is incomplete.
    // if (!studySession.flashcardSetId) {
    if (!studySession.listId) {
        await Logger.error(LogContext.STUDY, "Study session is corrupt or missing flashcardSetId", {
            requestId,
            metadata: { sessionId }
        });
        return NextResponse.json({ error: "Could not find flashcards for this session due to a data error." }, { status: 500 });
    }

    // 4. Find the associated flashcard set
    const flashcardSet = await db.collection<FlashcardSet>('flashcard_sets').findOne({
        _id: new ObjectId(studySession.listId)
    });
    console.log('flashcardSetpp :>> ', flashcardSet);

    if (!flashcardSet) {
        await Logger.error(LogContext.STUDY, "Flashcard set not found for a valid study session", {
            requestId,
            // This is now safe because of the check in step 3a
            metadata: { sessionId, flashcardSetId: studySession.listId.toHexString() }
        });
        return NextResponse.json({ error: "Could not find flashcards for this session" }, { status: 404 });
    }

    // 5. Authorization Check:
    // Allow if the set is public OR if the user is authenticated and owns the session.
    const isOwner = !!(
        userId &&
        studySession.userId &&
        studySession.userId.toHexString() === userId
    );

    if (!flashcardSet.isPublic && !isOwner) {
        await Logger.warning(LogContext.STUDY, "Unauthorized access attempt to private study session", {
            requestId,
            userId: userId || 'anonymous',
            metadata: { sessionId }
        });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 6. Access granted, return the flashcards
    await Logger.info(LogContext.STUDY, "Successfully fetched study session details", {
        requestId,
        userId: userId || 'anonymous',
        metadata: { sessionId, isPublic: flashcardSet.isPublic, flashcardsCount: flashcardSet.flashcards.length }
    });

    return NextResponse.json({ flashcards: flashcardSet.flashcards });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await Logger.error(LogContext.STUDY, `Error fetching study session: ${errorMessage}`, {
      requestId,
      metadata: { sessionId, errorStack: error instanceof Error ? error.stack : String(error) }
    });
    return NextResponse.json({ error: "Failed to fetch study session" }, { status: 500 });
  }
}
