/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/db/mongodb';
import { Logger, LogContext } from '@/lib/logging/logger';
import { AnalyticsLogger } from '@/lib/logging/logger';
import { authOptions } from '@/lib/auth/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  const requestId = await Logger.info(
    LogContext.FLASHCARD,
    "Lists retrieval request received"
  );

  try {
    // Attempt to get the session, but don't require it.
    const session = await getServerSession(authOptions);
    const client = await clientPromise;
    const db = client.db();
    
    let query: any;
    let userIdForLogging: string | undefined = undefined;

    if (session?.user) {
      // --- AUTHENTICATED USER ---
      // Retrieve all public sets AND the user's private sets.
      userIdForLogging = session.user.id;
      const userId = new ObjectId(userIdForLogging);
      
      query = {
        $or: [
          { isPublic: true },
          { userId: userId }
        ]
      };

      await Logger.debug(
        LogContext.FLASHCARD, 
        "Processing authenticated request for flashcard sets", 
        { userId: userIdForLogging, requestId }
      );

    } else {
      // --- UNAUTHENTICATED USER ---
      // Retrieve only public sets.
      query = { isPublic: true };
      
      await Logger.debug(
        LogContext.FLASHCARD, 
        "Processing unauthenticated request for public flashcard sets", 
        { requestId }
      );
    }
    
    // Execute the query against the 'flashcard_sets' collection.
    const flashcardSets = await db.collection('flashcard_sets')
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();
    
    // Track analytics (optional for unauthenticated users, but good to know)
    await AnalyticsLogger.trackEvent({
      userId: userIdForLogging,
      eventType: "public_lists_viewed",
      properties: {
        count: flashcardSets.length,
        isAuthenticated: !!userIdForLogging
      }
    });
    
    await Logger.info(
      LogContext.FLASHCARD,
      "Flashcard sets retrieved successfully",
      { 
        requestId, 
        userId: userIdForLogging, 
        metadata: { 
          count: flashcardSets.length 
        }
      }
    );
    
    return NextResponse.json(flashcardSets);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(
      LogContext.FLASHCARD,
      `Error retrieving flashcard sets: ${errorMessage}`,
      {
        requestId,
        metadata: {
          error,
          stack: error instanceof Error ? error.stack : undefined
        }
      }
    );
    
    return NextResponse.json({ 
      error: 'Failed to retrieve flashcard sets' 
    }, { status: 500 });
  }
}