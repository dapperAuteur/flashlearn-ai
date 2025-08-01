import mongoose from 'mongoose';

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
  // This field will hold ML-specific data for spaced repetition scheduling
  mlData: {
    easinessFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    nextReviewDate: { type: Date, default: Date.now },
  },
});

// ============================
// Flashcard Set Schema
// A collection of flashcards, belonging to a single profile.
// ============================
const FlashcardSetSchema = new mongoose.Schema({
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  source: {
    type: String,
    enum: ['Prompt', 'PDF', 'YouTube', 'Audio', 'Image', 'CSV'], // All sources from PRD
  },
  flashcards: [FlashcardSchema], // Embedding flashcards within the set
}, { timestamps: true });

export const FlashcardSet = mongoose.models.FlashcardSet || mongoose.model('FlashcardSet', FlashcardSetSchema);