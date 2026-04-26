import mongoose, { Document, Schema, Types } from 'mongoose';
import type { IStandardRef } from './EcosystemSession';

export interface ICardAttempt extends Document {
  apiKeyId: Types.ObjectId;
  childId: string;
  sessionId: string;
  cardId: Types.ObjectId;
  standardCodes: IStandardRef[];
  attemptNumber: number;
  correctOnFirstAttempt: boolean;
  isCorrect: boolean;
  latencyMs: number;
  confidenceRating?: 1 | 2 | 3 | 4 | 5;
  attemptedAt: Date;
  createdAt: Date;
}

const StandardRefSchema = new Schema<IStandardRef>({
  framework: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
}, { _id: false });

const CardAttemptSchema = new Schema<ICardAttempt>({
  apiKeyId: {
    type: Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: true,
    index: true,
  },
  childId: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  cardId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  standardCodes: {
    type: [StandardRefSchema],
    default: [],
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: 1,
  },
  correctOnFirstAttempt: {
    type: Boolean,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
  latencyMs: {
    type: Number,
    required: true,
    min: 0,
  },
  confidenceRating: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
  },
  attemptedAt: {
    type: Date,
    required: true,
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Cascade primary index.
CardAttemptSchema.index({ apiKeyId: 1, childId: 1 });
// Idempotent per (sessionId, cardId, attemptNumber). Same attempt arriving twice
// (network retry from consumer) collapses cleanly.
CardAttemptSchema.index({ sessionId: 1, cardId: 1, attemptNumber: 1 }, { unique: true });
// Mastery rollup driver — narrow scan when computing per-standard rates.
CardAttemptSchema.index({ apiKeyId: 1, childId: 1, 'standardCodes.code': 1, attemptedAt: -1 });

export const CardAttempt =
  mongoose.models.CardAttempt ||
  mongoose.model<ICardAttempt>('CardAttempt', CardAttemptSchema, 'card_attempts');
