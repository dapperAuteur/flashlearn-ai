// app/api/flashcards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import { Logger, LogContext } from "@/lib/logging/logger";
import { AnalyticsLogger } from "@/lib/logging/logger";
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  // Generate request ID for tracking this operation
  const requestId = await Logger.info(
    LogContext.FLASHCARD,
    "Flashcard creation request received",
    { request }
  );

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      await Logger.warning(
        LogContext.FLASHCARD,
        "Unauthorized flashcard creation attempt",
        { requestId }
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    await Logger.debug(
      LogContext.FLASHCARD, 
      "Processing flashcard creation", 
      { userId, requestId }
    );

    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.front || !data.back || !data.listId) {
      await Logger.warning(
        LogContext.FLASHCARD,
        "Invalid flashcard data - missing required fields",
        { requestId, userId, metadata: { data } }
      );
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Sanitize HTML content
    const sanitizedData = {
      ...data,
      front: sanitizeHtml(data.front),
      back: sanitizeHtml(data.back)
    };
    
    // Add timestamps and user ID
    const flashcardData = {
      ...sanitizedData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Insert flashcard
    const result = await db.collection('flashcards').insertOne(flashcardData);
    const flashcardId = result.insertedId.toString();
    
    await Logger.info(
      LogContext.FLASHCARD,
      "Flashcard created successfully",
      { 
        requestId, 
        userId, 
        metadata: { 
          flashcardId,
          listId: data.listId,
          hasTags: Array.isArray(data.tags) && data.tags.length > 0
        }
      }
    );
    
    // Update card count in list
    await db.collection('lists').updateOne(
      { _id: new ObjectId(data.listId), userId },
      { $inc: { cardCount: 1 } }
    );
    
    // Track analytics event
    await AnalyticsLogger.trackEvent({
      userId,
      eventType: AnalyticsLogger.EventType.FLASHCARD_CREATED,
      properties: {
        flashcardId,
        listId: data.listId,
        hasFrontImage: !!data.frontImage,
        hasBackImage: !!data.backImage,
        difficulty: data.difficulty,
        tagCount: Array.isArray(data.tags) ? data.tags.length : 0,
        creationMethod: data.creationMethod || "manual"
      }
    });
    
    // Return success with ID
    return NextResponse.json({
      id: flashcardId,
      message: 'Flashcard created successfully'
    }, { status: 201 });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(
      LogContext.FLASHCARD,
      `Error creating flashcard: ${errorMessage}`,
      {
        requestId,
        metadata: {
          error,
          stack: error instanceof Error ? error.stack : undefined
        }
      }
    );
    
    return NextResponse.json({ 
      error: 'Failed to create flashcard' 
    }, { status: 500 });
  }
}