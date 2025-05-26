// app/api/lists/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/db/mongodb';
import { Logger, LogContext } from '@/lib/logging/logger';
import { AnalyticsLogger } from '@/lib/logging/logger';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const requestId = await Logger.info(
    LogContext.FLASHCARD,
    "Lists retrieval request received"
  );

  try {
    // Check authentication
    // allow unauthenticated users to use 'shared_flashcard_sets' from db
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      await Logger.warning(
        LogContext.FLASHCARD,
        "Unauthorized lists retrieval attempt",
        { requestId }
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('list route userId :>> ', userId);
    await Logger.debug(
      LogContext.FLASHCARD, 
      "Processing lists retrieval", 
      { userId, requestId }
    );

    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Get all lists for the current user
    const lists = await db.collection('lists')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();
    
    // Track analytics
    await AnalyticsLogger.trackEvent({
      userId,
      eventType: "lists_viewed",
      properties: {
        count: lists.length,
        timestamp: new Date()
      }
    });
    
    await Logger.info(
      LogContext.FLASHCARD,
      "Lists retrieved successfully",
      { 
        requestId, 
        userId, 
        metadata: { 
          count: lists.length 
        }
      }
    );
    
    return NextResponse.json(lists);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(
      LogContext.FLASHCARD,
      `Error retrieving lists: ${errorMessage}`,
      {
        requestId,
        metadata: {
          error,
          stack: error instanceof Error ? error.stack : undefined
        }
      }
    );
    
    return NextResponse.json({ 
      error: 'Failed to retrieve lists' 
    }, { status: 500 });
  }
}