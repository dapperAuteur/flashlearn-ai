// app/api/flashcards/[id]/review/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/db/mongodb';
import { SpacedRepetitionService } from '@/lib/services/spacedRepetitionService';
import { Logger, LogContext } from '@/lib/logging/logger';
import { AnalyticsLogger } from '@/lib/logging/logger';
import { z } from 'zod';

// Validation schema
const reviewSchema = z.object({
  quality: z.enum(['0', '1', '2', '3']).transform(val => parseInt(val)),
  timeSpent: z.number().positive()
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = await Logger.info(LogContext.FLASHCARD, 'Review result submission');
  
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const flashcardId = params.id;
    
    // Validate request body
    const body = await request.json();
    const result = reviewSchema.safeParse(body);
    
    if (!result.success) {
      await Logger.warning(LogContext.FLASHCARD, 'Invalid review data', {
        requestId,
        metadata: { errors: result.error.errors }
      });
      return NextResponse.json({ error: 'Invalid review data' }, { status: 400 });
    }
    
    const { quality, timeSpent } = result.data;
    
    // Get flashcard
    const client = await clientPromise;
    const db = client.db();
    
    const flashcard = await db.collection('flashcards').findOne({
      _id: new ObjectId(flashcardId),
      userId
    });
    
    if (!flashcard) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });
    }
    
    // Calculate next review
    const reviewResult = SpacedRepetitionService.calculateNextReview(
      flashcard as any,
      { quality: quality as 0 | 1 | 2 | 3, timeSpent }
    );
    
    // Update flashcard
    const updateData: any = {
      lastReviewed: new Date(),
      nextReviewDate: reviewResult.nextReviewDate,
      stage: reviewResult.stage,
      updatedAt: new Date()
    };
    
    // Update counters
    if (quality === 0) {
      updateData.$inc = { incorrectCount: 1 };
    } else {
      updateData.$inc = { correctCount: 1 };
    }
    
    // Store ease factor in metadata
    updateData['metadata.easeFactor'] = reviewResult.easeFactor;
    updateData['metadata.lastInterval'] = reviewResult.interval;
    updateData['metadata.lastStudyDate'] = new Date();
    
    await db.collection('flashcards').updateOne(
      { _id: new ObjectId(flashcardId) },
      { 
        $set: updateData.$set || updateData,
        $inc: updateData.$inc || {}
      }
    );
    
    await Logger.info(LogContext.FLASHCARD, 'Review recorded successfully', {
      requestId,
      userId,
      metadata: {
        flashcardId,
        quality,
        nextInterval: reviewResult.interval,
        stage: reviewResult.stage
      }
    });
    
    // Track analytics
    await AnalyticsLogger.trackEvent({
      userId,
      eventType: 'flashcard_reviewed',
      properties: {
        flashcardId,
        quality,
        timeSpent,
        interval: reviewResult.interval,
        stage: reviewResult.stage
      }
    });
    
    return NextResponse.json({
      success: true,
      nextReview: reviewResult.nextReviewDate,
      interval: reviewResult.interval,
      stage: reviewResult.stage
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(LogContext.FLASHCARD, `Error recording review: ${errorMessage}`, {
      requestId,
      metadata: { error, stack: error instanceof Error ? error.stack : undefined }
    });
    
    return NextResponse.json({ error: 'Failed to record review' }, { status: 500 });
  }
}