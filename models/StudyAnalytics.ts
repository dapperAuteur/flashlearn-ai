import mongoose from 'mongoose';

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
  }],
  // Tracks performance for the set as a whole
  setPerformance: {
    totalStudySessions: { type: Number, default: 0 },
    totalTimeStudied: { type: Number, default: 0 }, // in seconds
    averageScore: { type: Number, default: 0 },
  },
}, { timestamps: true });

export const StudyAnalytics = mongoose.models.StudyAnalytics || mongoose.model('StudyAnalytics', StudyAnalyticsSchema);
