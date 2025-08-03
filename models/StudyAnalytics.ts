import mongoose from 'mongoose';

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
    required: true,
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
  }],
  // Tracks performance for the set as a whole
  setPerformance: {
    totalStudySessions: { type: Number, default: 0 },
    totalTimeStudied: { type: Number, default: 0 }, // in seconds
    averageScore: { type: Number, default: 0 },
  },
}, { timestamps: true });

export const StudyAnalytics = mongoose.models.StudyAnalytics || mongoose.model('StudyAnalytics', StudyAnalyticsSchema);
