import mongoose, { Schema, Document, Types } from 'mongoose';

// Per-student SM-2 state for one card, scoped to the partner's API key and their
// own opaque student id. This is a projection of ExternalStudyResult: it is
// recomputed by replaying that student's results for the card in time order.
//
// Keyed by (apiKeyId, externalStudentId, ...) from day one so a future
// "Sign in with FlashLearn" claim can re-parent a student's rows onto a real
// Profile (set linkedProfileId) instead of rebuilding history.
export interface IExternalStudentCardState extends Document {
  apiKeyId: Types.ObjectId;
  externalStudentId: string;
  setId: Types.ObjectId;
  cardId: Types.ObjectId;
  cardExternalId?: string;
  easinessFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  correctCount: number;
  incorrectCount: number;
  lastResultAt?: Date;
  linkedProfileId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExternalStudentCardStateSchema = new Schema<IExternalStudentCardState>(
  {
    apiKeyId: { type: Schema.Types.ObjectId, ref: 'ApiKey', required: true },
    externalStudentId: { type: String, required: true, trim: true },
    setId: { type: Schema.Types.ObjectId, ref: 'FlashcardSet', required: true },
    cardId: { type: Schema.Types.ObjectId, required: true },
    cardExternalId: { type: String, trim: true },
    easinessFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    nextReviewDate: { type: Date, default: Date.now },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    lastResultAt: { type: Date },
    // Set when the student claims a FlashLearn account; null while anonymous.
    linkedProfileId: { type: Schema.Types.ObjectId, ref: 'Profile' },
  },
  { timestamps: true },
);

// Upsert key: one state row per student per card.
ExternalStudentCardStateSchema.index(
  { apiKeyId: 1, externalStudentId: 1, setId: 1, cardId: 1 },
  { unique: true },
);
// due-cards read: a student's cards in (or past) their review window.
ExternalStudentCardStateSchema.index({ apiKeyId: 1, externalStudentId: 1, setId: 1, nextReviewDate: 1 });

export const ExternalStudentCardState =
  mongoose.models.ExternalStudentCardState ||
  mongoose.model<IExternalStudentCardState>(
    'ExternalStudentCardState',
    ExternalStudentCardStateSchema,
    'external_student_card_states',
  );
