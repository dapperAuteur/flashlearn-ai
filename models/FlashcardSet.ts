import mongoose, { Document, Schema, Types } from 'mongoose';

// ============================
// Embedded Flashcard Document
// A single card within a set.
// ============================
const FlashcardSchema = new mongoose.Schema({
  front: {
    type: String,
    required: true,
    trim: true,
  },
  back: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: true });

// Interface for a single flashcard
export interface IFlashcard {
  _id?: Types.ObjectId;
  front: string;
  back: string;
}

// Interface for the FlashcardSet document
export interface IFlashcardSet extends Document {
  profile: mongoose.Types.ObjectId;
  title: string;
  cardCount: number;
  description?: string;
  isPublic: boolean;
  source: 'Text Prompt' | 'PDF' | 'YouTube' | 'Audio' | 'Image' | 'CSV';
  flashcards: IFlashcard[];
  parentSetId?: mongoose.Types.ObjectId; // Optional link to the original, complete set
  createdAt: Date;
  updatedAt: Date;
}

// ============================
// Flashcard Set Schema
// A collection of flashcards, belonging to a single profile.
// ============================
const FlashcardSetSchema = new Schema<IFlashcardSet>({
  profile: {
    type: Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  cardCount: {
    type: Number,
    required: true,
    default: 0
  },
  description: {
    type: String,
    required: false,
    trim: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  source: {
    type: String,
    enum: ['Prompt', 'PDF', 'YouTube', 'Audio', 'Image', 'CSV'],
    required: true,
  },
  flashcards: [FlashcardSchema], // Embedding flashcards within the set
  parentSetId: { // This is the new field
    type: Schema.Types.ObjectId,
    ref: 'FlashcardSet',
    required: false, // It's only required for subsets
  }
}, { timestamps: true });

export const FlashcardSet = mongoose.models.FlashcardSet || mongoose.model('FlashcardSet', FlashcardSetSchema, 'flashcard_sets');