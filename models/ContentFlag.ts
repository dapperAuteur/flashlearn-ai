import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IContentFlag extends Document {
  setId: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;
  reason: 'inappropriate' | 'offensive' | 'spam' | 'copyright' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action-taken';
  reviewedBy?: mongoose.Types.ObjectId;
  adminAction?: 'none' | 'set-private' | 'set-deleted' | 'user-warned' | 'user-suspended';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentFlagSchema = new Schema<IContentFlag>({
  setId: {
    type: Schema.Types.ObjectId,
    ref: 'FlashcardSet',
    required: true,
  },
  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    enum: ['inappropriate', 'offensive', 'spam', 'copyright', 'other'],
    required: true,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'dismissed', 'action-taken'],
    default: 'pending',
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  adminAction: {
    type: String,
    enum: ['none', 'set-private', 'set-deleted', 'user-warned', 'user-suspended'],
    default: 'none',
  },
  adminNotes: {
    type: String,
  },
}, { timestamps: true });

// Prevent duplicate flags from the same user on the same set
ContentFlagSchema.index({ setId: 1, reportedBy: 1 }, { unique: true });

// Efficient querying by status and date
ContentFlagSchema.index({ status: 1, createdAt: -1 });

export const ContentFlag = models.ContentFlag || model<IContentFlag>('ContentFlag', ContentFlagSchema);
