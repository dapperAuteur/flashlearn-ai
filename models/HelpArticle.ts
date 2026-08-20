import mongoose, { Document, Schema } from 'mongoose';

export interface IHelpArticle extends Document {
  slug: string;
  title: string;
  category: 'getting-started' | 'study-modes' | 'versus' | 'offline' | 'api' | 'teams' | 'account' | 'billing';
  content: string;
  excerpt: string;
  order: number;
  isPublished: boolean;
  tags: string[];
  helpfulYes: number;
  helpfulNo: number;
  createdAt: Date;
  updatedAt: Date;
}

const HelpArticleSchema = new Schema<IHelpArticle>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'getting-started',
        'study-modes',
        'versus',
        'offline',
        'api',
        'teams',
        'account',
        'billing',
      ],
    },
    content: {
      type: String,
      required: [true, 'Content is required.'],
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [300, 'Excerpt must be at most 300 characters'],
    },
    order: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    // Counted from the article footer. Deliberately two counters rather than a
    // score: the ratio matters less than the volume behind it, and an article
    // read twice is not the same problem as one read four hundred times.
    helpfulYes: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulNo: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

// No explicit index on slug: `unique: true` on the field already builds one,
// and declaring both made Mongoose warn about a duplicate on every connect.
HelpArticleSchema.index({ category: 1, order: 1 });
HelpArticleSchema.index({ isPublished: 1 });

export const HelpArticle =
  mongoose.models.HelpArticle || mongoose.model<IHelpArticle>('HelpArticle', HelpArticleSchema);
