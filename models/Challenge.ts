import mongoose, { Document, Schema } from 'mongoose';

export interface IScoreBreakdown {
  accuracyScore: number;
  speedScore: number;
  confidenceScore: number;
  streakScore: number;
  accuracy: number;
  averageTimeSeconds: number;
  longestStreak: number;
}

export interface IChallengeParticipant {
  userId: mongoose.Types.ObjectId;
  userName: string;
  sessionId?: string;
  status: 'invited' | 'accepted' | 'completed' | 'declined';
  compositeScore?: number;
  scoreBreakdown?: IScoreBreakdown;
  rank?: number;
  completedAt?: Date;
}

export interface IChallenge extends Document {
  challengeCode: string;
  flashcardSetId: mongoose.Types.ObjectId;
  setName: string;
  creatorId: mongoose.Types.ObjectId;
  studyMode: 'classic' | 'multiple-choice';
  studyDirection: 'front-to-back' | 'back-to-front';
  cardCount: number;
  cardIds: string[];
  scope: 'direct' | 'classroom' | 'team' | 'public';
  classroomId?: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'completed' | 'expired';
  expiresAt: Date;
  participants: IChallengeParticipant[];
  maxParticipants: number;
  shortLinkId?: string;
  shortLinkUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScoreBreakdownSchema = new Schema(
  {
    accuracyScore: { type: Number },
    speedScore: { type: Number },
    confidenceScore: { type: Number },
    streakScore: { type: Number },
    accuracy: { type: Number },
    averageTimeSeconds: { type: Number },
    longestStreak: { type: Number },
  },
  { _id: false },
);

const ParticipantSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    sessionId: { type: String },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'completed', 'declined'],
      default: 'accepted',
    },
    compositeScore: { type: Number },
    scoreBreakdown: { type: ScoreBreakdownSchema },
    rank: { type: Number },
    completedAt: { type: Date },
  },
  { _id: false },
);

const ChallengeSchema = new Schema<IChallenge>(
  {
    challengeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    flashcardSetId: {
      type: Schema.Types.ObjectId,
      ref: 'FlashcardSet',
      required: true,
    },
    setName: { type: String, required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studyMode: {
      type: String,
      enum: ['classic', 'multiple-choice'],
      default: 'classic',
    },
    studyDirection: {
      type: String,
      enum: ['front-to-back', 'back-to-front'],
      default: 'front-to-back',
    },
    cardCount: { type: Number, required: true },
    cardIds: [{ type: String }],
    scope: {
      type: String,
      enum: ['direct', 'classroom', 'team', 'public'],
      default: 'direct',
    },
    classroomId: { type: Schema.Types.ObjectId, ref: 'Classroom' },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'expired'],
      default: 'pending',
    },
    expiresAt: { type: Date, required: true },
    participants: [ParticipantSchema],
    maxParticipants: { type: Number, default: 2 },
    shortLinkId: { type: String, default: null },
    shortLinkUrl: { type: String, default: null },
  },
  { timestamps: true },
);

ChallengeSchema.index({ challengeCode: 1 });
ChallengeSchema.index({ creatorId: 1, status: 1, createdAt: -1 });
ChallengeSchema.index({ 'participants.userId': 1, status: 1 });
ChallengeSchema.index({ classroomId: 1, status: 1 });
ChallengeSchema.index({ status: 1, expiresAt: 1 });
ChallengeSchema.index({ flashcardSetId: 1, scope: 1 });

export const Challenge =
  mongoose.models.Challenge ||
  mongoose.model<IChallenge>('Challenge', ChallengeSchema, 'challenges');
