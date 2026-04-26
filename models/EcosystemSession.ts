import mongoose, { Document, Schema, Types } from 'mongoose';
import type { AgeBand } from './CurriculumStandard';

export type EcosystemSessionStatus =
  | 'scheduled'
  | 'delivered'
  | 'completed'
  | 'expired'
  | 'purged';

export interface IStandardRef {
  framework: string;
  code: string;
}

export interface ISessionSourceContext {
  consumer: string;
  bookId?: string;
  hubId?: string;
  completedAt: Date;
}

export interface IEcosystemSession extends Document {
  sessionId: string;
  apiKeyId: Types.ObjectId;
  childId: string;
  ageBand: AgeBand;
  standards: IStandardRef[];
  sourceContext: ISessionSourceContext;
  flashcardSetId: Types.ObjectId;
  estimatedCardCount: number;
  scheduledFor: Date;
  status: EcosystemSessionStatus;
  qstashMessageId?: string;
  playStartedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StandardRefSchema = new Schema<IStandardRef>({
  framework: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
}, { _id: false });

const SessionSourceContextSchema = new Schema<ISessionSourceContext>({
  consumer: { type: String, required: true, trim: true },
  bookId: { type: String, trim: true },
  hubId: { type: String, trim: true },
  completedAt: { type: Date, required: true },
}, { _id: false });

const EcosystemSessionSchema = new Schema<IEcosystemSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
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
  ageBand: {
    type: String,
    enum: ['4-7', '8-12', '13-18'],
    required: true,
  },
  standards: {
    type: [StandardRefSchema],
    required: true,
    validate: [(v: unknown[]) => Array.isArray(v) && v.length > 0, 'At least one standard is required.'],
  },
  sourceContext: {
    type: SessionSourceContextSchema,
    required: true,
  },
  flashcardSetId: {
    type: Schema.Types.ObjectId,
    ref: 'FlashcardSet',
    required: true,
  },
  estimatedCardCount: {
    type: Number,
    required: true,
  },
  scheduledFor: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'delivered', 'completed', 'expired', 'purged'],
    default: 'scheduled',
  },
  qstashMessageId: {
    type: String,
  },
  playStartedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

// Cascade-delete primary index — every (apiKeyId, childId) lookup hits this.
EcosystemSessionSchema.index({ apiKeyId: 1, childId: 1 });
// Session-list / replay queries scoped to a child.
EcosystemSessionSchema.index({ apiKeyId: 1, childId: 1, status: 1, scheduledFor: 1 });
// Reconciliation sweep for stuck/orphaned scheduled sessions.
EcosystemSessionSchema.index({ scheduledFor: 1, status: 1 });

export const EcosystemSession =
  mongoose.models.EcosystemSession ||
  mongoose.model<IEcosystemSession>('EcosystemSession', EcosystemSessionSchema, 'ecosystem_sessions');
