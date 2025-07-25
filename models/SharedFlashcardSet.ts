export interface SharedFlashcardSet {
  _id?: string;
  topic: string;
  normalizedTopic: string;
  flashcards: Flashcard[];
  createdBy?: string; // Optional user ID
  usageCount: number;
  ratings: {
    count: number;
    sum: number;
    average: number;
  };
  quality: number; // Average rating if implemented
  createdAt: Date;
  updatedAt: Date;
}