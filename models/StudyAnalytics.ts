import mongoose from 'mongoose';

// ============================
// Confidence Data Schema
// ============================
const ConfidenceDataSchema = new mongoose.Schema({
  averageConfidence: { type: Number, default: 0 },
  confidenceDistribution: {
    level1: { type: Number, default: 0 },
    level2: { type: Number, default: 0 },
    level3: { type: Number, default: 0 },
    level4: { type: Number, default: 0 },
    level5: { type: Number, default: 0 }
  },
  luckyGuesses: { type: Number, default: 0 },
  confidentCorrect: { type: Number, default: 0 },
  confidentIncorrect: { type: Number, default: 0 }
});

// ============================
// Per-Card ML Data Schema
// ============================
const MlDataSchema = new mongoose.Schema({
    easinessFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    nextReviewDate: { type: Date, default: Date.now },
});

// ============================
// Study Analytics Schema
// Tracks performance data for a user profile.
// ============================
const StudyAnalyticsSchema = new mongoose.Schema({
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: false,
  },
  set: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FlashcardSet',
    required: true,
  },
  // Tracks performance for each card within the set
  cardPerformance: [{
    cardId: { type: mongoose.Schema.Types.ObjectId, required: true },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    totalTimeStudied: { type: Number, default: 0 }, // in seconds
    mlData: MlDataSchema, // Embedding the ML data for each card here
    confidenceData: ConfidenceDataSchema, // Add confidence tracking per card
  }],
  // Tracks performance for the set as a whole
  setPerformance: {
    totalStudySessions: { type: Number, default: 0 },
    totalTimeStudied: { type: Number, default: 0 }, // in seconds
    averageScore: { type: Number, default: 0 },
    overallConfidenceData: ConfidenceDataSchema, // Add overall confidence tracking
  },
}, { timestamps: true });

export const StudyAnalytics = mongoose.models.StudyAnalytics || mongoose.model('StudyAnalytics', StudyAnalyticsSchema);