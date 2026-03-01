'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Participant {
  userId: string;
  userName: string;
  sessionId?: string;
  status: 'invited' | 'accepted' | 'completed' | 'declined';
  compositeScore?: number;
  rank?: number;
  completedAt?: string;
}

interface ChallengeData {
  _id: string;
  challengeCode: string;
  setName: string;
  studyMode: 'classic' | 'multiple-choice';
  studyDirection: 'front-to-back' | 'back-to-front';
  cardCount: number;
  scope: 'direct' | 'classroom' | 'public';
  status: 'pending' | 'active' | 'completed' | 'expired';
  expiresAt: string;
  participants: Participant[];
  maxParticipants: number;
  createdAt: string;
}

interface CompositeScoreResult {
  totalScore: number;
  accuracyScore: number;
  speedScore: number;
  confidenceScore: number;
  streakScore: number;
  accuracy: number;
  averageTimeSeconds: number;
  longestStreak: number;
  confidenceCalibration: number;
}

interface Flashcard {
  _id: string;
  front: string;
  back: string;
}

interface ChallengeContextValue {
  challenge: ChallengeData | null;
  sessionId: string | null;
  flashcards: Flashcard[];
  compositeScore: CompositeScoreResult | null;
  isChallengeMode: boolean;
  isLoading: boolean;
  error: string | null;
  startChallenge: (challengeId: string) => Promise<{ sessionId: string; flashcards: Flashcard[] } | null>;
  completeChallenge: (challengeId: string) => Promise<CompositeScoreResult | null>;
  setChallenge: (challenge: ChallengeData | null) => void;
  reset: () => void;
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

export function ChallengeProvider({ children }: { children: ReactNode }) {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [compositeScore, setCompositeScore] = useState<CompositeScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startChallenge = useCallback(async (challengeId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/versus/challenges/${challengeId}/play`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to start challenge');
        return null;
      }
      const data = await res.json();
      setSessionId(data.sessionId);
      setFlashcards(data.flashcards);
      return { sessionId: data.sessionId, flashcards: data.flashcards };
    } catch {
      setError('Failed to start challenge');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeChallenge = useCallback(async (challengeId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/versus/challenges/${challengeId}/complete`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to complete challenge');
        return null;
      }
      const data = await res.json();
      setCompositeScore(data.compositeScore);
      setChallenge(data.challenge);
      return data.compositeScore;
    } catch {
      setError('Failed to complete challenge');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setChallenge(null);
    setSessionId(null);
    setFlashcards([]);
    setCompositeScore(null);
    setError(null);
  }, []);

  return (
    <ChallengeContext.Provider
      value={{
        challenge,
        sessionId,
        flashcards,
        compositeScore,
        isChallengeMode: challenge !== null,
        isLoading,
        error,
        startChallenge,
        completeChallenge,
        setChallenge,
        reset,
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
}

export function useChallenge() {
  const context = useContext(ChallengeContext);
  if (!context) {
    throw new Error('useChallenge must be used within a ChallengeProvider');
  }
  return context;
}
