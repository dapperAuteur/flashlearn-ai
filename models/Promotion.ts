import mongoose, { Document, Schema } from 'mongoose';

// A scheduled promotional period that temporarily lifts every tier's AI generation
// cap to a flat number. Replaces the hardcoded lib/promo/finals.ts approach so
// marketing can launch a new promo without engineering involvement.
//
// Active definition: a promotion is "active" when active === true AND
// startsAt <= now < endsAt. The kill-switch (active flag) lets admins disable
// a promo without changing dates. Multiple promotions can exist; only the one
// with the highest flatLimit wins among active records.
export interface IPromotion extends Document {
  slug: string;
  name: string;
  flatLimit: number;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
  bannerMessage: string;
  bannerLink?: string;
  bannerLinkLabel?: string;
  pricingCallout: string;
  pricingTierBadge: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 64,
      match: [/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 120,
    },
    flatLimit: {
      type: Number,
      required: true,
      min: 1,
      max: 1_000_000,
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    active: { type: Boolean, default: true },
    bannerMessage: { type: String, default: '', trim: true, maxlength: 240 },
    bannerLink: { type: String, trim: true, maxlength: 256 },
    bannerLinkLabel: { type: String, trim: true, maxlength: 60 },
    pricingCallout: { type: String, default: '', trim: true, maxlength: 240 },
    pricingTierBadge: { type: String, default: '', trim: true, maxlength: 60 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

PromotionSchema.index({ active: 1, startsAt: 1, endsAt: 1 });

export const Promotion =
  mongoose.models.Promotion || mongoose.model<IPromotion>('Promotion', PromotionSchema);
