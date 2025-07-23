// types/models.ts
import { ObjectId } from 'mongodb';

/**
 * Represents a list/deck of flashcards
 */
export interface List {
  _id?: string | ObjectId;
  name: string;                   // List name
  description: string;            // List description
  isPublic: boolean;              // Whether the list is public or private
  userId: string | ObjectId;      // Owner of this list
  categoryId?: string | ObjectId; // Optional category
  tags: string[] | ObjectId[];    // References to tags
  cardCount: number;              // Number of cards in this list
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// You can add other model interfaces here later