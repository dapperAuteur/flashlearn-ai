import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'bug' | 'feature' | 'general' | 'praise';
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  tags: string[];
  lastMessageAt: Date;
  unreadByAdmin: boolean;
  unreadByUser: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['bug', 'feature', 'general', 'praise'],
      default: 'general',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    tags: {
      type: [String],
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadByAdmin: {
      type: Boolean,
      default: true,
    },
    unreadByUser: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

ConversationSchema.index({ userId: 1 });
ConversationSchema.index({ status: 1, lastMessageAt: -1 });
ConversationSchema.index({ unreadByAdmin: 1 });

export const Conversation =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>('Conversation', ConversationSchema, 'conversations');
