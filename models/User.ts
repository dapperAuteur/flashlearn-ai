/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';

// ============================
// Main User Account Schema
// A single user login can have multiple profiles (e.g., for different subjects).
// ============================
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required.'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required.'],
  },
  role: {
    type: String,
    enum: ['Student', 'Admin'], // MVP focuses on Student role
    default: 'Student',
  },
  profiles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
  }],
  stripeCustomerId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values, but unique if valued
  },
  subscriptionTier: {
    type: String,
    enum: ['Free', 'Lifetime Learner'], // As per PRD
    default: 'Free',
  },
  // Rate Limiting Fields for AI Generation
  aiGenerationCount: {
    type: Number,
    default: 0,
  },
  lastAiGenerationDate: {
    type: Date,
  },
}, { timestamps: true });

// Exporting models
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
