/*
https://mongoosejs.com/docs/tutorials/virtuals.html
add virtuals to json export
do blog post on virtuals
Is there a way to create a virtual for tracking how many times the user has completed a session with each list?
Add the ability to pause session and pause time for session and create a paused UI component and a component to show all paused sessions for the current user.
**/
import mongoose, { Schema, Document } from 'mongoose';

// const opts = { toJSON: { virtuals: true } };
export type StudyDirection = 'front-to-back' | 'back-to-front';

export interface IStudySession extends Document {
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  listId: mongoose.Types.ObjectId;
  setName?: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed';
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  completedCards: number;
  studyDirection?: StudyDirection;
  studyMode?: 'classic' | 'multiple-choice' | 'type-answer';
  /**
   * Set when an adult ran this session on the learner's behalf. `userId` stays
   * the learner, so every existing query that filters on it (history, stats,
   * the dashboard, achievements) attributes the work correctly with no change.
   * This records who was holding the device.
   */
  proctorId?: mongoose.Types.ObjectId;
  proctorMode?: 'proctored' | 'handoff';
  isShareable: boolean;
  shortLinkId?: string;
  shortLinkUrl?: string;
  durationSeconds: number;

  // Virtual properties
  isComplete: boolean;
  accuracy: number;
}

const StudySessionSchema: Schema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listId: { type: Schema.Types.ObjectId, ref: 'List', required: true },
    setName: { type: String },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    totalCards: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    completedCards: { type: Number, default: 0 },
    studyDirection: {
      type: String,
      enum: ['front-to-back', 'back-to-front'],
      default: 'front-to-back'
    },
    studyMode: {
      type: String,
      enum: ['classic', 'multiple-choice', 'type-answer'],
      default: 'classic'
    },
    // Absent on ordinary self-study, which is every session recorded before
    // this field existed. Its absence is what "the learner did this alone"
    // means, so it has no default.
    proctorId: { type: Schema.Types.ObjectId, ref: 'User' },
    proctorMode: {
      type: String,
      enum: ['proctored', 'handoff'],
    },
    isShareable: { type: Boolean, default: false },
    shortLinkId: { type: String, default: null },
    shortLinkUrl: { type: String, default: null }
  },
  { timestamps: true }
);

StudySessionSchema.index({ userId: 1, createdAt: -1 });
StudySessionSchema.index({ userId: 1, status: 1, startTime: -1 });
// "Sessions I proctored", for a teacher reviewing what they recorded. Sparse
// because only proctored sessions carry the field.
StudySessionSchema.index({ proctorId: 1, createdAt: -1 }, { sparse: true });
// sessionId is already indexed by `unique: true` on the field; a second
// declaration here triggered Mongoose's duplicate-index warning.

// Virtual property to check if session is complete
StudySessionSchema.virtual('isComplete').get(function(this: IStudySession) {
  return this.completedCards >= this.totalCards;
});

// Virtual property to calculate accuracy
StudySessionSchema.virtual('accuracy').get(function(this: IStudySession) {
  const answered = this.correctCount + this.incorrectCount;
  return answered > 0 ? (this.correctCount / answered) * 100 : 0;
});

// Virtual property to calculate duration in seconds
StudySessionSchema.virtual('durationSeconds').get(function(this: IStudySession) {
  if (!this.endTime || !this.startTime) return 0;
  return Math.round((this.endTime.getTime() - this.startTime.getTime()) / 1000);
});

export const StudySession = mongoose.models.StudySession || 
  mongoose.model<IStudySession>('StudySession', StudySessionSchema, 'studySessions');