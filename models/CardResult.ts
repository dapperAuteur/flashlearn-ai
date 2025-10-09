import mongoose, { Schema, Document } from 'mongoose';

export interface ICardResult extends Document {
  sessionId: string;
  setId: string;
  flashcardId: string;
  isCorrect: boolean;
  timeSeconds: number;
  confidenceRating?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CardResultSchema: Schema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    setId: { type: String, required: true, index: true },
    flashcardId: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    timeSeconds: { type: Number, required: true, min: 0 },
    confidenceRating: { type: Number, min: 1, max: 5 }
  },
  { timestamps: true }
);

CardResultSchema.index({ sessionId: 1, flashcardId: 1 });

export const CardResult = mongoose.models.CardResult || 
  mongoose.model<ICardResult>('CardResult', CardResultSchema, 'cardResults');