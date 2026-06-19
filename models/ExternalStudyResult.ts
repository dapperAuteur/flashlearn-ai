import mongoose, { Schema, Document, Types } from 'mongoose';

// One raw study/quiz result pushed by a partner app for an external student.
// This is the source of truth: per-student SM-2 state (ExternalStudentCardState)
// is recomputed by replaying these in occurredAt order, so the store is a pure
// projection of the ledger and ingestion is idempotent.
//
// The unique index on (apiKeyId, externalStudentId, cardExternalId, occurredAt)
// dedupes retries: a re-POSTed result hits a duplicate key and is skipped.
export interface IExternalStudyResult extends Document {
  apiKeyId: Types.ObjectId;
  externalStudentId: string;
  setId: Types.ObjectId;
  cardId: Types.ObjectId;
  cardExternalId: string;
  isCorrect: boolean;
  confidenceRating?: number;
  source?: string;
  occurredAt: Date;
  createdAt: Date;
}

const ExternalStudyResultSchema = new Schema<IExternalStudyResult>(
  {
    apiKeyId: { type: Schema.Types.ObjectId, ref: 'ApiKey', required: true, index: true },
    externalStudentId: { type: String, required: true, trim: true },
    setId: { type: Schema.Types.ObjectId, ref: 'FlashcardSet', required: true },
    cardId: { type: Schema.Types.ObjectId, required: true },
    cardExternalId: { type: String, required: true, trim: true },
    isCorrect: { type: Boolean, required: true },
    confidenceRating: { type: Number, min: 1, max: 5 },
    source: { type: String, trim: true },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Idempotency / dedupe key for retried pushes.
ExternalStudyResultSchema.index(
  { apiKeyId: 1, externalStudentId: 1, cardExternalId: 1, occurredAt: 1 },
  { unique: true },
);
// Replay driver: all results for one student+card in time order.
ExternalStudyResultSchema.index({ apiKeyId: 1, externalStudentId: 1, setId: 1, cardId: 1, occurredAt: 1 });

export const ExternalStudyResult =
  mongoose.models.ExternalStudyResult ||
  mongoose.model<IExternalStudyResult>('ExternalStudyResult', ExternalStudyResultSchema, 'external_study_results');
