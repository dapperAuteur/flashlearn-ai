import { Document } from 'mongoose';


export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'Student' | 'Teacher' | 'Tutor' | 'Parent' | 'SchoolAdmin' | 'Admin';
  schoolId?: Schema.Types.ObjectId;
  linkedStudentIds?: Schema.Types.ObjectId[];
  subscriptionTier: 'Free' | 'Monthly Pro' | 'Annual Pro' | 'Lifetime Learner';
  profiles: Schema.Types.ObjectId[];
  stripeCustomerId?: string;
  aiGenerationCount: number;
  lastAiGenerationDate?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}