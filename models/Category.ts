import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  setCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: '#3B82F6',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    setCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

CategorySchema.index({ isActive: 1, sortOrder: 1 });

CategorySchema.pre('validate', function (next) {
  if (this.isModified('name') && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
  next();
});

export const Category =
  mongoose.models.Category ||
  mongoose.model<ICategory>('Category', CategorySchema, 'categories');
