import { Document } from 'mongoose';


export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'Student' | 'Admin';
  subscriptionTier: 'Free' | 'Monthly Pro' | 'Annual Pro' | 'Lifetime Learner';
  profiles: Schema.Types.ObjectId[];
  stripeCustomerId?: string;
  aiGenerationCount: number;
  lastAiGenerationDate?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}