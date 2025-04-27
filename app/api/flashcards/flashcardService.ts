// lib/api/flashcardService.ts
import { Flashcard, FlashcardFormData } from '@/types/flashcard';
import { Logger, LogContext } from "@/lib/logging/logger";

/**
 * Create a new flashcard
 */
export async function createFlashcard(data: FlashcardFormData): Promise<Flashcard> {
  const startTime = performance.now();
  
  try {
    await Logger.info(
      LogContext.FLASHCARD,
      "Client initiating flashcard creation",
      { metadata: { listId: data.listId } }
    );
    
    const response = await fetch('/api/flashcards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      await Logger.warning(
        LogContext.FLASHCARD,
        "Flashcard creation failed",
        { metadata: { error: responseData.error, status: response.status } }
      );
      throw new Error(responseData.error || 'Failed to create flashcard');
    }
    
    const duration = performance.now() - startTime;
    
    await Logger.info(
      LogContext.FLASHCARD,
      "Flashcard creation successful",
      { metadata: { id: responseData.id, durationMs: duration } }
    );
    
    return {
      id: responseData.id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(
      LogContext.FLASHCARD,
      `Flashcard creation error: ${errorMessage}`,
      { metadata: { error } }
    );
    
    throw error;
  }
}