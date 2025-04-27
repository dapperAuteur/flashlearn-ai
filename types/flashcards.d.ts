// types/flashcard.d.ts

/**
 * Represents the structure of a single flashcard
 * used throughout the FlashLearn AI application.
 */
export interface Flashcard {
  id?: string;
  /**
   * The term or question on the front of the card.
   */
  front: string;
  /**
   * The definition or answer on the back of the card.
   */
  back: string;
  frontImage?: string;
  backImage?: string;
  tags: string[];
  listId: string;
  difficulty: number;
  createdAt?: Date;
  updatedAt?: Date;

  // You could add more shared properties here later if needed, e.g.:
  // id?: string; // Optional database ID
  // deckId?: string;
  // tags?: string[];
}

export interface FlashcardFormData {
  front: string;
  back: string;
  frontImage?: File | string;
  backImage?: File | string;
  tags: string[];
  listId: string;
  difficulty: number;
}