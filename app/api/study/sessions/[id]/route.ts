/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { Logger, LogContext } from '@/lib/logging/logger';
import { StudySession } from '@/models/StudySession';
import { CardResult } from '@/models/CardResult';
import { FlashcardSet } from '@/models/FlashcardSet';

/**
 * GET /api/study/sessions/[id]
 * Returns session summary + per-card results.
 * - If session isShareable: accessible to anyone.
 * - If session belongs to authenticated user: always accessible.
 * - Otherwise: 404.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await context.params;
  const requestId = await Logger.info(LogContext.STUDY, 'Get study session results request', {
    metadata: { sessionId }
  });

  try {
    await dbConnect();

    const authSession = await getServerSession(authOptions);
    const userId = authSession?.user?.id;

    // Try finding by sessionId field first, then by _id
    let studySession: any = await StudySession.findOne({ sessionId }).lean();
    if (!studySession && mongoose.isValidObjectId(sessionId)) {
      studySession = await StudySession.findById(sessionId).lean();
    }

    if (!studySession) {
      await Logger.warning(LogContext.STUDY, 'Study session not found', {
        requestId,
        metadata: { sessionId }
      });
      return NextResponse.json({ error: 'Study session not found' }, { status: 404 });
    }

    const isOwner = !!(userId && studySession.userId?.toString() === userId);
    const isShareable = studySession.isShareable === true;

    if (!isOwner && !isShareable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch per-card results
    const cardResults = await CardResult.find({
      sessionId: studySession.sessionId
    }).lean();

    // Fetch set info for the set name and card front/back text
    let setName = 'Study Set';
    let isSetPublic = false;
    const cardMap: Record<string, { front: string; back: string }> = {};

    if (studySession.listId) {
      const flashcardSet = await FlashcardSet.findById(studySession.listId)
        .select('title isPublic flashcards')
        .lean() as any;

      if (flashcardSet) {
        setName = flashcardSet.title || setName;
        isSetPublic = flashcardSet.isPublic || false;
        for (const card of (flashcardSet.flashcards || [])) {
          cardMap[card._id.toString()] = { front: card.front, back: card.back };
        }
      }
    }

    // Build per-card details with front/back text
    const cardDetails = cardResults.map((cr: any) => {
      const cardInfo = cardMap[cr.flashcardId] || {};
      return {
        flashcardId: cr.flashcardId,
        front: cardInfo.front || '',
        back: cardInfo.back || '',
        isCorrect: cr.isCorrect,
        timeSeconds: cr.timeSeconds,
        confidenceRating: cr.confidenceRating,
      };
    });

    const response = {
      sessionId: studySession.sessionId,
      setId: studySession.listId?.toString(),
      setName,
      isSetPublic,
      status: studySession.status,
      totalCards: studySession.totalCards,
      correctCount: studySession.correctCount,
      incorrectCount: studySession.incorrectCount,
      studyDirection: studySession.studyDirection,
      startTime: studySession.startTime,
      endTime: studySession.endTime,
      isShareable: studySession.isShareable,
      cardResults: cardDetails,
    };

    await Logger.info(LogContext.STUDY, 'Successfully fetched session results', {
      requestId,
      userId: userId || 'anonymous',
      metadata: { sessionId, cardCount: cardDetails.length }
    });

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await Logger.error(LogContext.STUDY, `Error fetching session results: ${errorMessage}`, {
      requestId,
      metadata: { sessionId }
    });
    return NextResponse.json({ error: 'Failed to fetch session results' }, { status: 500 });
  }
}
