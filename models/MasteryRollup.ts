import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  DEMONSTRATED_THRESHOLD,
  ROLLUP_WINDOW,
  type MasteryState,
} from '@/lib/api/masteryRollup';

export { DEMONSTRATED_THRESHOLD, ROLLUP_WINDOW };
export type { MasteryState };

export interface IMasteryRollup extends Document {
  apiKeyId: Types.ObjectId;
  childId: string;
  framework: string;
  code: string;
  state: MasteryState;
  firstAttemptCorrectRate: number;
  recentFirstAttempts: boolean[];
  attemptCount: number;
  firstAttemptCount: number;
  lastAttemptAt?: Date;
  lastSessionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MasteryRollupSchema = new Schema<IMasteryRollup>({
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
  framework: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    enum: ['exposed', 'practiced', 'demonstrated'],
    default: 'exposed',
  },
  firstAttemptCorrectRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  recentFirstAttempts: {
    type: [Boolean],
    default: [],
  },
  attemptCount: {
    type: Number,
    default: 0,
  },
  firstAttemptCount: {
    type: Number,
    default: 0,
  },
  lastAttemptAt: { type: Date },
  lastSessionAt: { type: Date },
}, { timestamps: true });

// Cascade primary + GET /mastery driver.
MasteryRollupSchema.index({ apiKeyId: 1, childId: 1 });
// Upsert key — one rollup row per (key, child, framework, code).
MasteryRollupSchema.index(
  { apiKeyId: 1, childId: 1, framework: 1, code: 1 },
  { unique: true },
);

export const MasteryRollup =
  mongoose.models.MasteryRollup ||
  mongoose.model<IMasteryRollup>('MasteryRollup', MasteryRollupSchema, 'mastery_rollups');
