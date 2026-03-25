import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityEvent extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'study_session' | 'achievement_earned' | 'set_created' | 'set_shared' | 'challenge_completed' | 'team_joined' | 'follow';
  metadata: Record<string, unknown>;
  visibility: 'public' | 'followers' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

const ActivityEventSchema = new Schema<IActivityEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'study_session',
        'achievement_earned',
        'set_created',
        'set_shared',
        'challenge_completed',
        'team_joined',
        'follow',
      ],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
    },
  },
  { timestamps: true },
);

ActivityEventSchema.index({ userId: 1, createdAt: -1 });
ActivityEventSchema.index({ visibility: 1, createdAt: -1 });

export const ActivityEvent =
  mongoose.models.ActivityEvent || mongoose.model<IActivityEvent>('ActivityEvent', ActivityEventSchema);
