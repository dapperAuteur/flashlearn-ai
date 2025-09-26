// models/UserAnalytics.ts
import mongoose from 'mongoose';

export interface IUserAnalytics extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  
  // Acquisition tracking
  firstVisit: Date;
  acquisitionSource?: string; // UTM source, referrer, etc.
  acquisitionMedium?: string; // organic, social, paid, etc.
  acquisitionCampaign?: string;
  landingPage?: string;
  
  // Engagement tracking
  totalSessions: number;
  totalTimeSpent: number; // seconds
  lastActive: Date;
  sessionsBeforePurchase?: number;
  timeToConversion?: number; // days from signup to purchase
  
  // Feature usage
  flashcardSetsUsed: string[]; // Array of set IDs
  favoriteFeatures: string[]; // AI generation, study modes, etc.
  studySessionsCompleted: number;
  
  // Conversion tracking
  purchaseDate?: Date;
  purchasedPlan?: 'monthly' | 'annual' | 'lifetime';
  conversionValue?: number;
  
  // Behavior patterns
  mostActiveTimeOfDay?: number; // 0-23 hour
  mostActiveDay?: number; // 0-6 day of week
  averageSessionLength?: number; // seconds
}

const UserAnalyticsSchema = new mongoose.Schema<IUserAnalytics>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // Acquisition
  firstVisit: { type: Date, default: Date.now },
  acquisitionSource: String,
  acquisitionMedium: String, 
  acquisitionCampaign: String,
  landingPage: String,
  
  // Engagement
  totalSessions: { type: Number, default: 0 },
  totalTimeSpent: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  sessionsBeforePurchase: Number,
  timeToConversion: Number,
  
  // Feature usage
  flashcardSetsUsed: [{ type: String }],
  favoriteFeatures: [{ type: String }],
  studySessionsCompleted: { type: Number, default: 0 },
  
  // Conversion
  purchaseDate: Date,
  purchasedPlan: { type: String, enum: ['monthly', 'annual', 'lifetime'] },
  conversionValue: Number,
  
  // Behavior
  mostActiveTimeOfDay: Number,
  mostActiveDay: Number,
  averageSessionLength: Number,
}, { timestamps: true });

export const UserAnalytics = mongoose.models.UserAnalytics || mongoose.model('UserAnalytics', UserAnalyticsSchema);