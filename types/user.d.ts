export interface IUser extends Document {
  email: string;
  password?: string;
  role: 'Student' | 'Admin';
  profiles: Schema.Types.ObjectId[];
  stripeCustomerId?: string;
  subscriptionTier: 'Free' | 'Lifetime Learner';
  aiGenerationCount: number;
  lastAiGenerationDate?: Date;
}