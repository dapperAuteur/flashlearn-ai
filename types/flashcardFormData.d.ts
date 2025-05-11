import { ObjectId } from 'mongodb';

/**
 * Data transfer object for creating/updating a flashcard
 */
export interface FlashcardFormData {
  front: string;
  back: string;
  frontImage?: File | string;     // Can be a File object (for upload) or a URL string
  backImage?: File | string;
  tags: string[];
  listId: string;
  difficulty: number;
}