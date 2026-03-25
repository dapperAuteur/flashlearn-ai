import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamMessage extends Document {
  teamId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  type: 'message' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

const TeamMessageSchema = new Schema<ITeamMessage>(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required.'],
      maxlength: [2000, 'Message must be at most 2000 characters'],
    },
    type: {
      type: String,
      enum: ['message', 'system'],
      default: 'message',
    },
  },
  { timestamps: true },
);

TeamMessageSchema.index({ teamId: 1, createdAt: -1 });

export const TeamMessage =
  mongoose.models.TeamMessage || mongoose.model<ITeamMessage>('TeamMessage', TeamMessageSchema);
