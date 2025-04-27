// app/actions/flashcardActions.ts
'use server'

import { sanitizeHtml } from '@/lib/utils/sanitize';
import clientPromise from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { Logger, LogContext } from "@/lib/logging/logger";
import { AnalyticsLogger } from "@/lib/logging/logger";
import { getServerSession } from "next-auth/next";
import { FlashcardFormData } from '@/types/flashcards';
import { authOptions } from '../api/auth/[...nextauth]/route';

export async function createFlashcard(formData: FlashcardFormData) {
  const requestId = await Logger.info(
    LogContext.FLASHCARD,
    "Flashcard creation server action called"
  );
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error('Unauthorized');
    }
    const userId = session.user.id;
    
    // Sanitize HTML content
    const sanitizedData = {
      ...formData,
      front: sanitizeHtml(formData.front),
      back: sanitizeHtml(formData.back)
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
    
    // Update card count in list
    await db.collection('lists').updateOne(
      { _id: new ObjectId(formData.listId), userId },
      { $inc: { cardCount: 1 } }
    );
    
    // Track analytics
    await AnalyticsLogger.trackEvent({
      userId,
      eventType: "flashcard_created",
      properties: {
        flashcardId,
        listId: formData.listId
      }
    });
    
    return { success: true, id: flashcardId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(
      LogContext.FLASHCARD,
      `Flashcard creation error: ${errorMessage}`,
      { requestId }
    );
    return { success: false, error: errorMessage };
  }
}