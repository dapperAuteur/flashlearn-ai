/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/study/review-queue/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/db/mongodb';
import { ReviewQueueService } from '@/lib/services/reviewQueueService';
import { Logger, LogContext } from '@/lib/logging/logger';
import { AnalyticsLogger } from '@/lib/logging/logger';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const requestId = await Logger.info(LogContext.STUDY, 'Review queue request');
  
  try {
    Logger.debug(LogContext.STUDY, 'Review queue request received', {
      requestId
    });
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      await Logger.error(LogContext.STUDY, 'Unauthorized access to review queue', {
        requestId
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const maxNew = parseInt(searchParams.get('maxNew') || '20');
    const maxReviews = parseInt(searchParams.get('maxReviews') || '100');
    
    const client = await clientPromise;
    const db = client.db();
    
    // Build query
    const query: any = { userId };
    if (listId) query.listId = listId;
    
    // Fetch flashcards
    const flashcards = await db.collection('flashcards')
      .find(query)
      .toArray();
    
    // Build review queue
    const queue = await ReviewQueueService.buildReviewQueue(flashcards, {
      maxNewCardsPerDay: maxNew,
      maxReviewsPerDay: maxReviews
    });
    
    // Interleave cards for optimal learning
    const orderedCards = ReviewQueueService.interleaveCards(queue);
    
    await Logger.info(LogContext.STUDY, 'ROUTE: Review queue built successfully: requestId, userId, listId, metadata', {
      requestId,
      userId,
      listId,
      metadata: {
        totalDue: queue.totalDue,
        newCards: queue.newCards.length,
        reviews: queue.reviewCards.length
      }
    });
    
    // Track analytics
    await AnalyticsLogger.trackEvent({
      userId,
      eventType: 'review_queue_generated',
      properties: {
        listId,
        newCards: queue.newCards.length,
        reviewCards: queue.reviewCards.length
      }
    });
    
    return NextResponse.json({
      cards: orderedCards,
      summary: {
        newCards: queue.newCards.length,
        reviewCards: queue.reviewCards.length,
        totalDue: queue.totalDue
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(LogContext.STUDY, `Error building review queue: ${errorMessage}`, {
      requestId,
      metadata: { error, stack: error instanceof Error ? error.stack : undefined }
    });
    
    return NextResponse.json({ error: 'Failed to build review queue' }, { status: 500 });
  }
}