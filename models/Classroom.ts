import mongoose, { Document, Schema } from 'mongoose';

export interface IClassroom extends Document {
  name: string;
  schoolId?: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  joinCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClassroomSchema = new Schema<IClassroom>({
  name: {
    type: String,
    required: true,
    trim: true,
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
  joinCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
}, { timestamps: true });

export const Classroom = mongoose.models.Classroom || mongoose.model<IClassroom>('Classroom', ClassroomSchema);
