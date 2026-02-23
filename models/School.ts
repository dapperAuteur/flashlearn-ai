import mongoose, { Document, Schema } from 'mongoose';

export interface ISchool extends Document {
  name: string;
  district?: string;
  schoolCode: string;
  adminId: mongoose.Types.ObjectId;
  subscriptionTier: 'Individual Teacher' | 'School' | 'District';
  teachers: mongoose.Types.ObjectId[];
  students: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  district: {
    type: String,
    trim: true,
  },
  schoolCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subscriptionTier: {
    type: String,
    enum: ['Individual Teacher', 'School', 'District'],
    default: 'Individual Teacher',
  },
  teachers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  students: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

export const School = mongoose.models.School || mongoose.model<ISchool>('School', SchoolSchema);
