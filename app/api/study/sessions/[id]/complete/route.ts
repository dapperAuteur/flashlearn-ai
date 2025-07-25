// app/api/study/sessions/[id]/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/db/mongodb';
import { Logger, LogContext } from '@/lib/logging/logger';
import { authOptions } from '@/lib/auth/auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise <{ id: string }> }
) {
  const params = await context;
  const requestId = await Logger.info(LogContext.STUDY, "Complete study session request");

  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = params?.id;
    
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
    
    // Mark session as complete
    await db.collection('studySessions').updateOne(
      { _id: new ObjectId(sessionId) },
      { 
        $set: { 
          endTime: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    // Get updated session with stats
    const updatedSession = await db.collection('studySessions').findOne({
      _id: new ObjectId(sessionId)
    });
    
    // Calculate stats
    const totalAnswered = updatedSession?.correctCount + updatedSession?.incorrectCount;
    const accuracy = totalAnswered > 0 ? (updatedSession?.correctCount / totalAnswered) * 100 : 0;
    const durationSeconds = Math.round(
      (updatedSession?.endTime.getTime() - updatedSession?.startTime.getTime()) / 1000
    );
    
    await Logger.info(LogContext.STUDY, "Study session completed", {
      requestId,
      userId: session.user.id,
      metadata: { 
        sessionId, 
        accuracy, 
        durationSeconds,
        cardsCompleted: updatedSession?.completedCards
      }
    });
    
    // Return session summary
    return NextResponse.json({
      sessionId,
      totalCards: updatedSession?.totalCards,
      completedCards: updatedSession?.completedCards,
      correctCount: updatedSession?.correctCount,
      incorrectCount: updatedSession?.incorrectCount,
      accuracy,
      durationSeconds
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(LogContext.STUDY, `Error completing study session: ${errorMessage}`, { requestId });
    return NextResponse.json({ error: "Failed to complete study session" }, { status: 500 });
  }
}