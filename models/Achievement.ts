import mongoose, { Schema } from 'mongoose';

const AchievementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'first_session',
        'streak_7',
        'streak_30',
        'perfect_score',
        'card_mastered',
        'sessions_10',
        'sessions_50',
        'sessions_100',
        'cards_studied_100',
        'cards_studied_500',
        'versus_first_win',
        'versus_wins_10',
        'versus_wins_50',
        'versus_perfect_score',
        'versus_streak_5',
        'versus_streak_10',
      ],
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, default: 'trophy' },
    earnedAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// One achievement of each type per user
AchievementSchema.index({ userId: 1, type: 1 }, { unique: true });

export const Achievement =
  mongoose.models.Achievement || mongoose.model('Achievement', AchievementSchema);
