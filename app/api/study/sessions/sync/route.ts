/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { StudySession } from '@/models/StudySession';
import { CardResult } from '@/models/CardResult';
import { Logger, LogContext, LogLevel } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { 
      sessionId, 
      setId, 
      setName,
      totalCards,
      correctCount,
      incorrectCount,
      durationSeconds,
      startTime,
      endTime,
      results = [], // Card results array
      studyDirection
    } = body;

    // Validate required fields
    if (!sessionId || !setId) {
      return NextResponse.json({ 
        error: 'Missing required fields: sessionId and setId' 
      }, { status: 400 });
    }

    Logger.log({
      context: LogContext.STUDY,
      level: LogLevel.INFO,
      message: 'Syncing session',
      userId: session.user.id,
      metadata: { sessionId, setId, resultsCount: results.length }
    });

    // Check if session already exists
    const existingSession = await StudySession.findOne({ sessionId });

    if (existingSession) {
      // Update existing session
      existingSession.completedCards = totalCards;
      existingSession.correctCount = correctCount;
      existingSession.incorrectCount = incorrectCount;
      existingSession.durationSeconds = durationSeconds;
      existingSession.endTime = new Date(endTime);
      existingSession.studyDirection = studyDirection;
      
      await existingSession.save();

      Logger.log({
        context: LogContext.STUDY,
        level: LogLevel.INFO,
        message: 'Study session updated',
        userId: session.user.id,
        metadata: {
          sessionId,
          results
        }
      });

      // return NextResponse.json({ 
      //   success: true, 
      //   sessionId,
      //   updated: true 
      // });
    } else {
      // Create new session
      const newSession = new StudySession({
        sessionId,
        userId: session.user.id,
        listId: setId,
        setName,
        totalCards,
        completedCards: totalCards,
        correctCount,
        incorrectCount,
        durationSeconds,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'completed',
        studyDirection: studyDirection || 'front-to-back',
      });

      await newSession.save();

      Logger.log({
        context: LogContext.STUDY,
        level: LogLevel.INFO,
        message: 'Study session created',
        userId: session.user.id,
        metadata: { sessionId }
      });

      // Save individual card results
    let savedResultsCount = 0;
    if (results && results.length > 0) {
      // Delete existing results for this session (in case of retry)
      await CardResult.deleteMany({ sessionId });

      // Bulk insert new results
      const cardResultDocs = results.map((result: any) => ({
        sessionId,
        setId,
        flashcardId: result.cardId,
        isCorrect: result.isCorrect,
        timeSeconds: result.timeSeconds,
        confidenceRating: result.confidenceRating
      }));

      const insertedResults = await CardResult.insertMany(cardResultDocs);
      savedResultsCount = insertedResults.length;

      Logger.log({
        context: LogContext.STUDY,
        level: LogLevel.INFO,
        message: 'Card results saved',
        userId: session.user.id,
        metadata: { sessionId, count: savedResultsCount }
      });
    }

    return NextResponse.json({ 
      success: true, 
      sessionId,
      created: !existingSession,
      updated: !!existingSession,
      cardResultsSaved: savedResultsCount
    });
  }
  } catch (error) {
    Logger.log({
      context: LogContext.STUDY,
      level: LogLevel.ERROR,
      message: 'Failed to sync study session',
      metadata: { error: error instanceof Error ? error.message : error }
    });

    return NextResponse.json({ 
      error: 'Failed to sync session',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}