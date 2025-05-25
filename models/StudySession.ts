// models/StudySession.ts
/*
https://mongoosejs.com/docs/tutorials/virtuals.html
add virtuals to json export
do blog post on virtuals
Is there a way to create a virtual for tracking how many times the user has completed a session with each list?
Add the ability to pause session and pause time for session and create a paused UI component and a component to show all paused sessions for the current user.
**/
import mongoose, { Schema, Document } from 'mongoose';

// const opts = { toJSON: { virtuals: true } };

export interface IStudySession extends Document {
  userId: mongoose.Types.ObjectId;
  listId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  completedCards: number;
  
  // Virtual properties
  isComplete: boolean;
  accuracy: number;
  durationSeconds: number;
}

const StudySessionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listId: { type: Schema.Types.ObjectId, ref: 'List', required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    totalCards: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    completedCards: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Virtual property to check if session is complete
StudySessionSchema.virtual('isComplete').get(function() {
  return this.completedCards >= this.totalCards;
});

// Virtual property to calculate accuracy
StudySessionSchema.virtual('accuracy').get(function() {
  const answered = this.correctCount + this.incorrectCount;
  return answered > 0 ? (this.correctCount / answered) * 100 : 0;
});

// Virtual property to calculate duration in seconds
StudySessionSchema.virtual('durationSeconds').get(function() {
  if (!this.endTime) return 0;
  return Math.round((this.endTime.getTime() - this.startTime.getTime()) / 1000);
});

export default mongoose.models.StudySession || mongoose.model<IStudySession>('StudySession', StudySessionSchema);