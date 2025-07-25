// app/api/study/sessions/[id]/results/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/db/mongodb';
import { Logger, LogContext } from '@/lib/logging/logger';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const resolvedParams = await params;
  const requestId = await Logger.info(LogContext.STUDY, "Record card result request");

  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = await resolvedParams.id;
    const { flashcardId, isCorrect, timeSeconds } = await request.json();
    
    // Validate input
    if (!flashcardId || typeof isCorrect !== 'boolean' || !timeSeconds) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Verify study session exists and belongs to user
    const studySession = await db.collection('studySessions').findOne({
      _id: new ObjectId(sessionId),
      userId: new ObjectId(session.user.id)
    });
    
    if (!studySession) {
      return NextResponse.json({ error: "Study session not found" }, { status: 404 });
    }
    
    // Create card result
    const cardResult = {
      sessionId: new ObjectId(sessionId),
      flashcardId: new ObjectId(flashcardId),
      isCorrect,
      timeSeconds,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('cardResults').insertOne(cardResult);
    
    // Update study session stats
    await db.collection('studySessions').updateOne(
      { _id: new ObjectId(sessionId) },
      { 
        $inc: { 
          completedCards: 1,
          correctCount: isCorrect ? 1 : 0,
          incorrectCount: isCorrect ? 0 : 1
        },
        $set: { updatedAt: new Date() }
      }
    );
    
    // Log result
    await Logger.info(LogContext.STUDY, "Card result recorded", {
      requestId,
      userId: session.user.id,
      metadata: { sessionId, flashcardId, isCorrect }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(LogContext.STUDY, `Error recording card result: ${errorMessage}`, { requestId });
    return NextResponse.json({ error: "Failed to record result" }, { status: 500 });
  }
}