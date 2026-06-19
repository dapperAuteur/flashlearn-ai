import { ObjectId } from 'mongodb';

/**
 * Represents a flashcard in the system
 */
export interface Flashcard {
  _id?: string | ObjectId;
  id?: string | ObjectId;
  front: string;                  // Front content (question/term)
  back: string;                   // Back content (answer/definition)
  frontImage?: string;            // URL to image on front side
  backImage?: string;             // URL to image on back side
  frontImageAlt?: string;         // Screen-reader description for the front image
  backImageAlt?: string;          // Screen-reader description for the back image
  // Authored multiple-choice options. When present, multiple-choice study uses
  // these exact options and scores against correctOptionId instead of generating
  // distractors and treating `back` as correct.
  options?: { id: string; text: string }[];
  correctOptionId?: string;
  tags: string[] | ObjectId[];    // References to tags
  listId: string | ObjectId;      // Reference to parent list
  userId: string | ObjectId;      // Owner of this flashcard
  difficulty: number;             // Difficulty level (1-5)
  
  // Spaced repetition data
  lastReviewed?: Date;            // When the card was last reviewed
  nextReviewDate?: Date;          // When the card should be reviewed next  
  correctCount: number;           // Number of times answered correctly
  incorrectCount: number;         // Number of times answered incorrectly
  stage: number;                  // Current study stage (0-4)
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ISimpleFlashcard {
  _id?: string | ObjectId;
  id?: string | ObjectId;
  front: string;                  // Front content (question/term)
  back: string;
}

export interface IFlashcardSet {
  id: string; // The document ID
  _id: string; // The document ID
  userId: string;
  profileId: string;
  name?: string;
  description?: string;
  title: string;
  isPublic: boolean;
  cardCount: number;
  source: 'Prompt' | 'PDF' | 'YouTube' | 'Audio' | 'Image' | 'CSV' | 'Text' | 'Video';
  flashcards: IFlashcard[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
