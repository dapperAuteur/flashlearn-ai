/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, models } from 'mongoose';
import { IUser } from '@/types/user';


// ============================
// Main User Account Schema
// A single user login can have multiple profiles (e.g., for different subjects).
// ============================
// Define the Mongoose schema for the User model
const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required.'],
  },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    // Password is not strictly required because of potential OAuth providers in the future
  },
  role: {
    type: String,
    enum: ['Student', 'Admin'],
    default: 'Student',
  },
  subscriptionTier: {
    type: String,
  enum: ['Free', 'Active', 'Inactive', 'Lifetime Learner'],
  default: 'Free',
  },
  profiles: [{
    type: Schema.Types.ObjectId,
    ref: 'Profile',
  }],
  stripeCustomerId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values, but ensures uniqueness if a value exists
  },
  aiGenerationCount: {
    type: Number,
    default: 0,
  },
  lastAiGenerationDate: {
    type: Date,
  },
  // Fields for the password reset functionality
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
}, { timestamps: true }); // Automatically adds createdAt and updatedAt timestamps

// Create and export the User model. If the model already exists, use the existing one.
// This prevents Mongoose from recompiling the model on every hot-reload in development.
export const User = models.User || model<IUser>('User', UserSchema);
