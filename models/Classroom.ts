import mongoose, { Document, Schema } from 'mongoose';

export interface IClassroomSettings {
  allowStudentSets: boolean;
  allowStudentChat: boolean;
}

export interface IClassroom extends Document {
  name: string;
  description?: string;
  schoolId?: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  sharedSets: mongoose.Types.ObjectId[];
  joinCode: string;
  isArchived: boolean;
  settings: IClassroomSettings;
  createdAt: Date;
  updatedAt: Date;
}

const ClassroomSchema = new Schema<IClassroom>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description must be at most 500 characters'],
  },
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School',
  },
  teacherId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  students: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  sharedSets: [{
    type: Schema.Types.ObjectId,
    ref: 'FlashcardSet',
  }],
  joinCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  settings: {
    allowStudentSets: {
      type: Boolean,
      default: false,
    },
    allowStudentChat: {
      type: Boolean,
      default: true,
    },
  },
}, { timestamps: true });

export const Classroom = mongoose.models.Classroom || mongoose.model<IClassroom>('Classroom', ClassroomSchema);
