import mongoose, { Document, Schema } from 'mongoose';

export type AgeBand = '4-7' | '8-12' | '13-18';

export interface ICurriculumStandard extends Document {
  framework: string;
  code: string;
  title: string;
  description?: string;
  ageBand?: AgeBand;
  parentCode?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CurriculumStandardSchema = new Schema<ICurriculumStandard>({
  framework: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  ageBand: {
    type: String,
    enum: ['4-7', '8-12', '13-18'],
  },
  parentCode: {
    type: String,
    trim: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

CurriculumStandardSchema.index({ framework: 1, code: 1 }, { unique: true });
CurriculumStandardSchema.index({ framework: 1, ageBand: 1 });

export const CurriculumStandard =
  mongoose.models.CurriculumStandard ||
  mongoose.model<ICurriculumStandard>('CurriculumStandard', CurriculumStandardSchema, 'curriculum_standards');
