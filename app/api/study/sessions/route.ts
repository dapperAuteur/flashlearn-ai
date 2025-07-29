/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/db/mongodb';
import { Logger, LogContext } from '@/lib/logging/logger';
import { authOptions } from '@/lib/auth/auth';

export async function POST(request: NextRequest) {
  const requestId = await Logger.info(LogContext.STUDY, "Create study session request");

  try {
    // Attempt to get the session, but don't require it for public sets.
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? new ObjectId(session.user.id) : null;

    const { listId } = await request.json();
    if (!listId) {
      return NextResponse.json({ error: "List ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Build a query to find the flashcard set.
    const findQuery: any = { _id: new ObjectId(listId) };
    
    if (userId) {
      // If the user is authenticated, they can access public sets OR their own private sets.
      findQuery.$or = [{ isPublic: true }, { userId: userId }];
    } else {
      // If the user is not authenticated, they can ONLY access public sets.
      findQuery.isPublic = true;
    }

    // Find the requested flashcard set using the constructed query.
    const flashcardSet = await db.collection('flashcard_sets').findOne(findQuery);
    
    if (!flashcardSet) {
      await Logger.warning(LogContext.STUDY, "Flashcard set not found or access denied", {
        requestId,
        userId: userId?.toString(),
        listId,
      });
      return NextResponse.json({ error: "Flashcard set not found or you do not have permission to access it." }, { status: 404 });
    }
    
    const flashcards = flashcardSet.flashcards || [];
    
    if (flashcards.length === 0) {
      return NextResponse.json({ error: "This flashcard set contains no cards." }, { status: 400 });
    }
    
    // Create a new study session.
    // For anonymous users, we create a new ObjectId to act as a temporary user ID for this session.
    const studySession = {
      userId: userId || new ObjectId(),
      listId: new ObjectId(listId),
      startTime: new Date(),
      status: 'active',
      totalCards: flashcards.length,
      correctCount: 0,
      incorrectCount: 0,
      completedCards: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('studySessions').insertOne(studySession);
    
    await Logger.info(LogContext.STUDY, "Study session created successfully", {
      requestId,
      userId: session?.user?.id,
      isAnonymous: !userId,
      metadata: { sessionId: result.insertedId.toString(), cardCount: flashcards.length }
    });
    
    return NextResponse.json({
      sessionId: result.insertedId.toString(),
      flashcards: flashcards.map((card: any) => ({
        _id: card._id.toString(),
        front: card.front,
        back: card.back,
        frontImage: card.frontImage,
        backImage: card.backImage
      }))
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(LogContext.STUDY, `Error creating study session: ${errorMessage}`, { requestId });
    return NextResponse.json({ error: "Failed to create study session" }, { status: 500 });
  }
}
