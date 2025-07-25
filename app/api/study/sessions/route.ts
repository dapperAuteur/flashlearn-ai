// app/api/study/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/db/mongodb';
import { Logger, LogContext } from '@/lib/logging/logger';
import { authOptions } from '@/lib/auth/auth';

export async function POST(request: NextRequest) {
  const requestId = await Logger.info(LogContext.STUDY, "Create study session request");

  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { listId } = await request.json();
    if (!listId) {
      return NextResponse.json({ error: "List ID is required" }, { status: 400 });
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Verify list exists and belongs to user
    const list = await db.collection('lists').findOne({
      _id: new ObjectId(listId),
      // userId: new ObjectId(session.user.id) // BUG userId is causing list to return null, fix it
    });

    console.log('list :>> ', list);
    
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }
    
    // Get flashcards for this list
    const flashcards = await db.collection('flashcards').find({
      listId: new ObjectId(listId)
    }).toArray();

    console.log('flashcards :>> ', flashcards);
    
    if (flashcards.length === 0) {
      return NextResponse.json({ error: "No flashcards in this list" }, { status: 400 });
    }
    
    // Create new study session
    const studySession = {
      userId: new ObjectId(session.user.id),
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
    
    await Logger.info(LogContext.STUDY, "Study session created", {
      requestId,
      userId: session.user.id,
      metadata: { sessionId: result.insertedId.toString(), cardCount: flashcards.length }
    });
    
    return NextResponse.json({
      sessionId: result.insertedId.toString(),
      flashcards: flashcards.map(card => ({
        id: card._id.toString(),
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