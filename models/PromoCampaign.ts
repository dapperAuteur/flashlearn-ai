import mongoose, { Document, Schema } from 'mongoose';

export interface IPromoCampaign extends Document {
  name: string;
  tier: 'Lifetime Learner' | 'Monthly Pro' | 'Annual Pro';
  priceDisplay: string;
  priceCents: number;
  stripePriceId?: string;
  cashAppNote: string;
  userCap: number;
  redemptions: number;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCampaignSchema = new Schema<IPromoCampaign>(
  {
    name: { type: String, required: true, trim: true },
    tier: {
      type: String,
      required: true,
      enum: ['Lifetime Learner', 'Monthly Pro', 'Annual Pro'],
    },
    priceDisplay: { type: String, required: true },
    priceCents: { type: Number, required: true },
    stripePriceId: { type: String },
    cashAppNote: { type: String, default: '' },
    userCap: { type: Number, required: true, default: 100 },
    redemptions: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
  },
  { timestamps: true }
);

PromoCampaignSchema.index({ isActive: 1, tier: 1 });

export const PromoCampaign =
  mongoose.models.PromoCampaign ||
  mongoose.model<IPromoCampaign>('PromoCampaign', PromoCampaignSchema);
