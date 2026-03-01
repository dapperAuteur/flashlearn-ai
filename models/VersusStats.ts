import mongoose, { Schema } from 'mongoose';

const SetStatsSchema = new Schema(
  {
    setId: { type: Schema.Types.ObjectId, ref: 'FlashcardSet' },
    challenges: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
  },
  { _id: false },
);

const VersusStatsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    totalChallenges: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    currentWinStreak: { type: Number, default: 0 },
    bestWinStreak: { type: Number, default: 0 },
    totalCompositeScore: { type: Number, default: 0 },
    highestCompositeScore: { type: Number, default: 0 },
    averageCompositeScore: { type: Number, default: 0 },
    rating: { type: Number, default: 1000 },
    setStats: [SetStatsSchema],
  },
  { timestamps: true },
);

VersusStatsSchema.index({ userId: 1 });
VersusStatsSchema.index({ rating: -1 });

export const VersusStats =
  mongoose.models.VersusStats ||
  mongoose.model('VersusStats', VersusStatsSchema, 'versusStats');
