import { ObjectId } from 'mongodb';

/**
 * Represents a tag for organizing flashcards and lists
 */
export interface Tag {
  _id?: string | ObjectId;
  name: string;                   // Tag name
  userId: string | ObjectId;      // Owner of this tag
  color: string;                  // Color for the tag (hex code)
  usageCount: number;             // How many times this tag has been used
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}