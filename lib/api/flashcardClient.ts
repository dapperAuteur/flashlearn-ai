// lib/api/flashcardClient.ts
import { FlashcardFormData } from '@/types/flashcard';

/**
 * Client-side service for flashcard operations
 */
export const flashcardService = {
  /**
   * Creates a new flashcard
   */
  async createFlashcard(data: FlashcardFormData): Promise<{id: string}> {
    console.log("Creating flashcard", { listId: data.listId });
    
    const response = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Flashcard creation failed", { status: response.status });
      throw new Error(errorData.error || "Failed to create flashcard");
    }
    
    const result = await response.json();
    console.log("Flashcard created successfully", { id: result.id });
    
    return { id: result.id };
  }
};