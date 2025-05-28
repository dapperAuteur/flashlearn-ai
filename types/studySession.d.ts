import { ObjectId } from "mongodb";

export interface StudySessionProps {
  sessionId: string;
  listId?: string;
  onEndSession: () => void;
}

export interface ReviewQueueSummary {
  newCards: number;
  reviewCards: number;
  totalDue: number;
}

export interface StudySession {
  _id?: string | ObjectId;
  userId: string | ObjectId;      // Owner of this flashcard
  listId: string | ObjectId;      // Reference to parent list
  startTime: Date; // start of studySession
  endTime: Date; // end of studySession
  status: 'active' | 'completed'; // enum: active | completed default to active
  totalCards: number; // total cards seen in study session
  correctCount: number; // total cards correct in study session
  incorrectCount: number; // total cards incorrect in study session
  completedCards: number; // total cards completed in study session

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}