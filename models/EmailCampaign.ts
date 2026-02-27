import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailCampaign extends Document {
  name: string;
  subject: string;
  htmlContent: string;
  segment: 'all' | 'free-tier' | 'paid' | 'inactive-7d' | 'inactive-30d' | 'no-sets' | 'no-study';
  status: 'draft' | 'sending' | 'sent' | 'failed';
  sentBy?: mongoose.Types.ObjectId;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmailCampaignSchema = new Schema<IEmailCampaign>(
  {
    name: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    htmlContent: {
      type: String,
      required: true,
    },
    segment: {
      type: String,
      enum: ['all', 'free-tier', 'paid', 'inactive-7d', 'inactive-30d', 'no-sets', 'no-study'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'sending', 'sent', 'failed'],
      default: 'draft',
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

EmailCampaignSchema.index({ status: 1 });
EmailCampaignSchema.index({ sentAt: -1 });

export const EmailCampaign =
  mongoose.models.EmailCampaign ||
  mongoose.model<IEmailCampaign>('EmailCampaign', EmailCampaignSchema, 'emailcampaigns');
