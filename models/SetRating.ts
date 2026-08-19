import mongoose, { Schema, model, models, Document } from 'mongoose';

/**
 * One document per (set, user). Storing ratings as their own collection rather
 * than an array on the set document is what makes "change my rating" a single
 * upsert, keeps "how many distinct people rated this" exact, and stops two
 * concurrent raters from overwriting each other's write to the same array.
 *
 * The running average and total live on FlashcardSet as `ratingAverage` and
 * `ratingCount` so Explore can sort and page on them without a per-set
 * aggregation. `recomputeSetRating` in lib/api/setRatings.ts owns that write;
 * nothing else should set those two fields.
 */
export interface ISetRating extends Document {
  setId: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

const SetRatingSchema = new Schema<ISetRating>({
  setId: {
    type: Schema.Types.ObjectId,
    ref: 'FlashcardSet',
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
}, { timestamps: true });

// One rating per user per set. Re-rating is an upsert against this index, so a
// second POST updates the existing document instead of adding a duplicate.
SetRatingSchema.index({ setId: 1, user: 1 }, { unique: true });

// Supports "what have I rated" reads and account cleanup.
SetRatingSchema.index({ user: 1, updatedAt: -1 });

export const SetRating = models.SetRating || model<ISetRating>('SetRating', SetRatingSchema);
