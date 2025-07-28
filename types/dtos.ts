/**
 * DTO for creating or updating a flashcard
 */
export interface FlashcardFormData {
  front: string;                  // Front content (question/term)
  back: string;                   // Back content (answer/definition)
  frontImage?: File | string;     // Can be a File object (for upload) or a URL string
  backImage?: File | string;      // Can be a File object (for upload) or a URL string
  tags: string[];                 // Array of tag IDs
  listId: string;                 // Parent list ID
  difficulty: number;             // Difficulty level (1-5)
}

/**
 * DTO for creating or updating a list
 */
export interface ListFormData {
  name: string;                   // List name
  description: string;            // List description
  isPublic: boolean;              // Whether the list is public or private
  categoryId?: string;            // Optional category ID
  tags: string[];                 // Array of tag IDs
}

/**
 * DTO for creating or updating a category
 */
export interface CategoryFormData {
  name: string;                   // Category name
  description: string;            // Category description
  parentId?: string;              // Optional parent category ID
  color: string;                  // Color for the category (hex code)
}

/**
 * DTO for creating or updating a tag
 */
export interface TagFormData {
  name: string;                   // Tag name
  color: string;                  // Color for the tag (hex code)
}

/**
 * DTO for batch operations on flashcards
 */
export interface FlashcardBatchOperationData {
  flashcardIds: string[];         // IDs of flashcards to operate on
  operation: 'delete' | 'move' | 'tag' | 'untag'; // Operation type
  listId?: string;                // Target list ID for 'move' operation
  tagIds?: string[];              // Tag IDs for 'tag' operation
}

/**
 * DTO for CSV import
 */
export interface CsvImportData {
  listId: string;                 // List to import into
  file: File;                     // CSV file
  createNewTags: boolean;         // Whether to create new tags found in CSV
}

/**
 * DTO for flashcard study results
 */
export interface StudyResultData {
  flashcardId: string;            // ID of the flashcard studied
  correct: boolean;               // Whether the answer was correct
  timeTaken: number;              // Time taken in milliseconds
  difficultyLevel: number;        // Study mode difficulty (1-4)
}

export interface ImageUploadDTO {
  file: File;                 // The actual file being uploaded
  altText?: string;           // Optional alt text for accessibility
}

export interface ImageResponseDTO {
  url: string;                // URL to access the image
  fileId: string;             // MongoDB ID of the stored image
  fileName: string;           // Original file name
  mimeType: string;           // File MIME type
  size: number;               // File size in bytes
}