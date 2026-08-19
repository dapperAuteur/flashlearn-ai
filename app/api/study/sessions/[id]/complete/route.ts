import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/db/mongodb';
import { Logger, LogContext } from '@/lib/logging/logger';
import { authOptions } from '@/lib/auth/auth';
import { createActivityEvent } from '@/lib/services/activityService';
import { fireOutboxDrafts } from '@/lib/outbox-trigger';

export async function POST(
  request: NextRequest,
  context: { params: Promise <{ id: string }> }
) {
  const { id: sessionId } = await context.params;
  const requestId = await Logger.info(LogContext.STUDY, "Complete study session request");

  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // The learner owns the session, so a teacher completing a session they
    // proctored is not the owner. Match either. Without the proctorId arm this
    // 404s on every proctored session, because userId is the student.
    const actorId = new ObjectId(session.user.id);
    const studySession = await db.collection('studySessions').findOne({
      sessionId,
      $or: [{ userId: actorId }, { proctorId: actorId }],
    });
    
    if (!studySession) {
      return NextResponse.json({ error: "Study session not found" }, { status: 404 });
    }
    
    // Mark session as complete
    await db.collection('studySessions').updateOne(
      { sessionId },
      {
        $set: {
          status: 'completed',
          endTime: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    // Get updated session with stats
    const updatedSession = await db.collection('studySessions').findOne({
      sessionId
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

    // Credit the learner in the classroom feed, not whoever tapped the buttons.
    const learnerId = String(updatedSession?.userId ?? session.user.id);
    const wasProctored = Boolean(updatedSession?.proctorId);

    // Fire-and-forget activity event for the team / classroom feeds.
    createActivityEvent(learnerId, 'study_session', {
      sessionId,
      accuracy: Math.round(accuracy),
      durationSeconds,
      totalCards: updatedSession?.totalCards,
      completedCards: updatedSession?.completedCards,
    }).catch((err) => {
      Logger.warning(LogContext.SYSTEM, 'Failed to record study_session activity event', { requestId, error: err });
    });

    const durationMin = Math.max(1, Math.round(durationSeconds / 60));
    const accuracyPct = Math.round(accuracy);
    const cardCount = updatedSession?.completedCards ?? updatedSession?.totalCards ?? 0;
    const deckTitle = updatedSession?.setName ?? 'a study set';
    // Never draft a social post about a session somebody else sat. The caption
    // is written in the first person, and on a proctored session the person who
    // did the work is the student.
    if (!wasProctored) fireOutboxDrafts({
      triggerUserId: learnerId,
      externalRefBase: `study-session-${sessionId}`,
      caption: `Just drilled ${cardCount} cards on "${deckTitle}": ${accuracyPct}% recall after ${durationMin} minute${durationMin === 1 ? '' : 's'}.`,
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