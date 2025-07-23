// types/flashcard.d.ts

/**
 * Represents the structure of a single flashcard
 * used throughout the FlashLearn AI application.
 */
export interface Flashcard {
  /**
   * The term or question on the front of the card.
   */
  front: string;

  /**
   * The definition or answer on the back of the card.
   */
  back: string;

  // You could add more shared properties here later if needed, e.g.:
  // id?: string; // Optional database ID
  // deckId?: string;
  // tags?: string[];
}
