// models/CardResult.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ICardResult extends Document {
  sessionId: mongoose.Types.ObjectId;
  flashcardId: mongoose.Types.ObjectId;
  isCorrect: boolean;
  timeSeconds: number;
}

const CardResultSchema: Schema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'StudySession', required: true },
    flashcardId: { type: Schema.Types.ObjectId, ref: 'Flashcard', required: true },
    isCorrect: { type: Boolean, required: true },
    timeSeconds: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

export default mongoose.models.CardResult || mongoose.model<ICardResult>('CardResult', CardResultSchema);