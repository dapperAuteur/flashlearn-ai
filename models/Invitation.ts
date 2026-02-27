import mongoose, { Document, Schema } from 'mongoose';

export interface IInvitation extends Document {
  email: string;
  invitedBy: mongoose.Types.ObjectId;
  token: string;
  status: 'sent' | 'accepted' | 'expired';
  personalNote?: string;
  sentAt: Date;
  acceptedAt?: Date;
  acceptedUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['sent', 'accepted', 'expired'],
      default: 'sent',
    },
    personalNote: {
      type: String,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
    },
    acceptedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

InvitationSchema.index({ email: 1 });
InvitationSchema.index({ token: 1 });
InvitationSchema.index({ status: 1 });

export const Invitation =
  mongoose.models.Invitation ||
  mongoose.model<IInvitation>('Invitation', InvitationSchema, 'invitations');
