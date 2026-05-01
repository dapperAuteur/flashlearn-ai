import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamMember {
  userId: mongoose.Types.ObjectId;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: Date;
}

export interface ITeam extends Document {
  name: string;
  description?: string;
  avatar?: string;
  creatorId: mongoose.Types.ObjectId;
  members: ITeamMember[];
  sharedSets: mongoose.Types.ObjectId[];
  joinCode: string;
  isPublic: boolean;
  maxMembers: number;
  emailInvitesUsed: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const MAX_EMAIL_INVITES_PER_TEAM = 3;

const TeamMemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member',
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const TeamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required.'],
      trim: true,
      maxlength: [100, 'Team name must be at most 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be at most 500 characters'],
    },
    avatar: {
      type: String,
      default: null,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [TeamMemberSchema],
    sharedSets: [{
      type: Schema.Types.ObjectId,
      ref: 'FlashcardSet',
    }],
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    maxMembers: {
      type: Number,
      default: 20,
    },
    emailInvitesUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 30,
    }],
  },
  { timestamps: true },
);

TeamSchema.index({ creatorId: 1 });
TeamSchema.index({ 'members.userId': 1 });
TeamSchema.index({ joinCode: 1 });
TeamSchema.index({ isPublic: 1 });

export const Team =
  mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
