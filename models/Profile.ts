/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';

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
    validate: [(v: string | any[]) => v.length <= 3, 'A profile can have a maximum of 3 learning goals.'], //
  },
  customStudyAlerts: {
    type: [String], // Storing as strings like "HH:MM" in UTC is simplest
    validate: [(v: string | any[]) => v.length <= 3, 'A profile can have a maximum of 3 custom study alerts.'], //
  },
}, { timestamps: true });

export const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);
