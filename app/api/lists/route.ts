/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const session = await getServerSession(authOptions);
    const client = await clientPromise;
    const db = client.db();
    
    let query: any;
    let userIdForLogging: string | undefined = undefined;

    if (session?.user) {
      // --- AUTHENTICATED USER ---
      userIdForLogging = session.user.id;
      const userId = new ObjectId(userIdForLogging);

      await Logger.debug(
        LogContext.FLASHCARD, 
        "Processing authenticated request. Fetching user profiles.", 
        { userId: userIdForLogging, requestId }
      );

      // Step 1 & 2: Find all profiles for the current user and extract their IDs.
      const userProfiles = await db.collection('profiles').find({ user: userId }).project({ _id: 1 }).toArray();
      const userProfileIds = userProfiles.map(p => p._id);
      
      await Logger.debug(
        LogContext.FLASHCARD, 
        `Found ${userProfileIds.length} profiles for user.`, 
        { userId: userIdForLogging, requestId }
      );

      // Step 3: Build the query to retrieve all public sets OR sets belonging to the user's profiles.
      query = {
        $or: [
          { isPublic: true },
          { profile: { $in: userProfileIds } }
        ]
      };

    } else {
      // --- UNAUTHENTICATED USER ---
      query = { isPublic: true };
      
      await Logger.debug(
        LogContext.FLASHCARD, 
        "Processing unauthenticated request for public flashcard sets", 
        { requestId }
      );
    }
    
    // Execute the final query against the correct 'flashcardsets' collection.
    const flashcardSets = await db.collection('flashcard_sets') // CORRECTED COLLECTION NAME
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();
    
    await AnalyticsLogger.trackEvent({
      userId: userIdForLogging,
      eventType: "lists_viewed",
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