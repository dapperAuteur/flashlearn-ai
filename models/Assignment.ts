import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentProgress {
  studentId: mongoose.Types.ObjectId;
  status: 'not_started' | 'in_progress' | 'completed';
  accuracy?: number;
  completedAt?: Date;
  sessionId?: string;
}

export interface IAssignment extends Document {
  title: string;
  flashcardSetId: mongoose.Types.ObjectId;
  classroomId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  studentIds: mongoose.Types.ObjectId[];
  dueDate?: Date;
  studentProgress: IStudentProgress[];
  createdAt: Date;
  updatedAt: Date;
}

const StudentProgressSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
  },
  accuracy: Number,
  completedAt: Date,
  sessionId: String,
}, { _id: false });

const AssignmentSchema = new Schema<IAssignment>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  flashcardSetId: {
    type: Schema.Types.ObjectId,
    ref: 'FlashcardSet',
    required: true,
  },
  classroomId: {
    type: Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true,
  },
  teacherId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  dueDate: Date,
  studentProgress: [StudentProgressSchema],
}, { timestamps: true });

export const Assignment = mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);
