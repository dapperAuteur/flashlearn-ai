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
}, { timestamps: true });

// ============================
// User Profile Schema
// Each profile contains its own learning goals, alerts, and flashcard sets.
// ============================
const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  profileName: {
    type: String,
    required: true,
    trim: true,
  },
  learningGoals: {
    type: [String],
    validate: [v => v.length <= 3, 'A profile can have a maximum of 3 learning goals.'], //
  },
  customStudyAlerts: {
    type: [String], // Storing as strings like "HH:MM" in UTC is simplest
    validate: [v => v.length <= 3, 'A profile can have a maximum of 3 custom study alerts.'], //
  },
}, { timestamps: true });

// ============================
// Embedded Flashcard Document
// A single card within a set.
// ============================
const FlashcardSchema = new mongoose.Schema({
  front: {
    type: String,
    required: true,
    trim: true,
  },
  back: {
    type: String,
    required: true,
    trim: true,
  },
  // This field will hold ML-specific data for spaced repetition scheduling
  mlData: {
    easinessFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    nextReviewDate: { type: Date, default: Date.now },
  },
});

// ============================
// Flashcard Set Schema
// A collection of flashcards, belonging to a single profile.
// ============================
const FlashcardSetSchema = new mongoose.Schema({
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  source: {
    type: String,
    enum: ['Prompt', 'PDF', 'YouTube', 'Audio', 'Image', 'CSV'], // All sources from PRD
  },
  flashcards: [FlashcardSchema], // Embedding flashcards within the set
}, { timestamps: true });

// ============================
// Study Analytics Schema
// Tracks performance data for a user profile.
// ============================
const StudyAnalyticsSchema = new mongoose.Schema({
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
  set: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FlashcardSet',
    required: true,
  },
  // Tracks performance for each card within the set
  cardPerformance: [{
    cardId: { type: mongoose.Schema.Types.ObjectId, required: true },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    totalTimeStudied: { type: Number, default: 0 }, // in seconds
  }],
  // Tracks performance for the set as a whole
  setPerformance: {
    totalStudySessions: { type: Number, default: 0 },
    totalTimeStudied: { type: Number, default: 0 }, // in seconds
    averageScore: { type: Number, default: 0 },
  },
}, { timestamps: true });

// Exporting models
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);
export const FlashcardSet = mongoose.models.FlashcardSet || mongoose.model('FlashcardSet', FlashcardSetSchema);
export const StudyAnalytics = mongoose.models.StudyAnalytics || mongoose.model('StudyAnalytics', StudyAnalyticsSchema);