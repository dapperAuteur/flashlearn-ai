import { Schema, model, models, Document } from 'mongoose';

export interface ICouponTracker extends Document {
  stripeCouponId: string;
  stripePromoCodeId: string;
  code: string;
  description?: string;
  discountType: 'percent_off' | 'amount_off';
  discountValue: number;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  maxRedemptions?: number;
  expiresAt?: Date;
  createdBy: Schema.Types.ObjectId;
  isActive: boolean;
  redemptions: Array<{
    userId: Schema.Types.ObjectId;
    redeemedAt: Date;
    subscriptionTier: string;
  }>;
}

const CouponTrackerSchema = new Schema<ICouponTracker>({
  stripeCouponId: {
    type: String,
    required: true,
  },
  stripePromoCodeId: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
  },
  discountType: {
    type: String,
    enum: ['percent_off', 'amount_off'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
  },
  duration: {
    type: String,
    enum: ['once', 'repeating', 'forever'],
    required: true,
  },
  durationInMonths: {
    type: Number,
  },
  maxRedemptions: {
    type: Number,
  },
  expiresAt: {
    type: Date,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  redemptions: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
    subscriptionTier: {
      type: String,
    },
  }],
}, { timestamps: true });

CouponTrackerSchema.index({ code: 1 });
CouponTrackerSchema.index({ isActive: 1 });

export const CouponTracker = models.CouponTracker || model<ICouponTracker>('CouponTracker', CouponTrackerSchema);
