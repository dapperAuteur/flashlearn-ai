import { Schema, model, models, Document } from 'mongoose';

export interface IRevenueEvent extends Document {
  userId?: Schema.Types.ObjectId;
  stripeCustomerId?: string;
  eventType: 'subscription_created' | 'upgraded' | 'downgraded' | 'canceled' | 'payment_succeeded' | 'payment_failed' | 'refund';
  previousTier?: string;
  newTier?: string;
  amountCents: number;
  currency: string;
  stripeEventId: string;
}

const RevenueEventSchema = new Schema<IRevenueEvent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  stripeCustomerId: {
    type: String,
  },
  eventType: {
    type: String,
    enum: ['subscription_created', 'upgraded', 'downgraded', 'canceled', 'payment_succeeded', 'payment_failed', 'refund'],
    required: true,
  },
  previousTier: {
    type: String,
  },
  newTier: {
    type: String,
  },
  amountCents: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'usd',
  },
  stripeEventId: {
    type: String,
    unique: true,
    required: true,
  },
}, { timestamps: true });

RevenueEventSchema.index({ eventType: 1, createdAt: -1 });
RevenueEventSchema.index({ stripeEventId: 1 });

export const RevenueEvent = models.RevenueEvent || model<IRevenueEvent>('RevenueEvent', RevenueEventSchema);
