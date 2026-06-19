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
  // Optional caller-supplied stable id (e.g. "ces:glossary:abduction"). Lets a
  // partner app map its source content to a specific card so quiz outcomes can
  // drive review scheduling. Opaque to FlashLearn; never required.
  externalId: {
    type: String,
    trim: true,
  },
  // Optional authored multiple-choice options. When present, multiple-choice
  // study serves these exact options and scores against correctOptionId, instead
  // of AI-generating distractors and treating `back` as correct. Absent => the
  // existing generated-distractor behavior is unchanged.
  options: {
    type: [
      new mongoose.Schema(
        { id: { type: String, required: true, trim: true }, text: { type: String, required: true, trim: true } },
        { _id: false },
      ),
    ],
    default: undefined,
  },
  correctOptionId: {
    type: String,
    trim: true,
  },
  // Optional media on either side (e.g. a muscle image to identify). Values are
  // https URLs — our Cloudinary (via POST /api/v1/media) or any partner-hosted
  // CDN. Alt text is stored for screen readers; supply it whenever an image is set.
  frontImage: { type: String, trim: true },
  backImage: { type: String, trim: true },
  frontImageAlt: { type: String, trim: true },
  backImageAlt: { type: String, trim: true },
}, { _id: true });

// Interface for a single flashcard
export interface IFlashcardOption {
  id: string;
  text: string;
}

export interface IFlashcard {
  _id?: Types.ObjectId;
  front: string;
  back: string;
  externalId?: string;
  options?: IFlashcardOption[];
  correctOptionId?: string;
  frontImage?: string;
  backImage?: string;
  frontImageAlt?: string;
  backImageAlt?: string;
}

// Interface for the FlashcardSet document
export interface IFlashcardSet extends Document {
  profile: mongoose.Types.ObjectId;
  title: string;
  cardCount: number;
  description?: string;
  isPublic: boolean;
  source: 'Prompt' | 'PDF' | 'YouTube' | 'Audio' | 'Image' | 'CSV';
  flashcards: IFlashcard[];
  parentSetId?: mongoose.Types.ObjectId; // Optional link to the original, complete set
  categories: mongoose.Types.ObjectId[];
  tags?: string[];
  isFeatured?: boolean;
  featuredOrder?: number;
  shortLinkId?: string;
  shortLinkUrl?: string;
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
  },
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category',
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },
  featuredOrder: {
    type: Number,
    default: 0,
  },
  shortLinkId: { type: String, default: null },
  shortLinkUrl: { type: String, default: null },
}, { timestamps: true });

FlashcardSetSchema.index({ isPublic: 1, createdAt: -1 });
FlashcardSetSchema.index({ categories: 1, isPublic: 1, createdAt: -1 });

export const FlashcardSet = mongoose.models.FlashcardSet || mongoose.model('FlashcardSet', FlashcardSetSchema, 'flashcard_sets');