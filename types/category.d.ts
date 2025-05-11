import { ObjectId } from 'mongodb';
/**
 * Represents a category for organizing lists
 */
export interface Category {
  _id?: string | ObjectId;
  name: string;                   // Category name
  description: string;            // Category description
  userId: string | ObjectId;      // Owner of this category
  parentId?: string | ObjectId;   // Optional parent category for nesting
  color: string;                  // Color for the category (hex code)
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
