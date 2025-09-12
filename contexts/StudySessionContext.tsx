/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Flashcard } from '@/types/flashcard';
import { CardResult, saveResult, getResults, clearResults, queueSessionForSync } from '@/lib/db/indexeddb';
import { shuffleArray } from '@/lib/utils/arrayUtils';
import { Logger, LogContext } from '@/lib/logging/client-logger';

// --- 1. DEFINE THE SHAPE OF OUR CONTEXT STATE ---

type LastCardResult = 'correct' | 'incorrect' | null;

interface StudySessionState {
  // Session Status
  sessionId: string | null;
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;

  // Session Data
  flashcards: Flashcard[];
  currentIndex: number;
  cardResults: CardResult[];

  // Timer Data
  sessionStartTime: number | null;

  lastCardResult: LastCardResult;

  // Actions (functions to modify the state)
  startSession: (listId: string) => Promise<void>;
  recordCardResult: (isCorrect: boolean, timeSeconds: number) => Promise<void>;
  showNextCard: () => void;
  resetSession: () => void;
}

// --- 2. CREATE THE CONTEXT ---
// We provide a default empty implementation for type safety.
const StudySessionContext = createContext<StudySessionState | undefined>(undefined);

// --- 3. CREATE THE PROVIDER COMPONENT ---

interface StudySessionProviderProps {
  children: ReactNode;
}

export const StudySessionProvider = ({ children }: { children: ReactNode }) => {
  const { data: authSession } = useSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [lastCardResult, setLastCardResult] = useState<LastCardResult>(null);

  // --- LOGIC MOVED FROM OLD COMPONENTS ---

  const startSession = useCallback(async (listId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      Logger.log(LogContext.STUDY, "Attempting to start a new session.", { listId });
      const response = await fetch('/api/study/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start study session');
      }

      const data: { sessionId: string; flashcards: Flashcard[] } = await response.json();

      if (!data.flashcards || data.flashcards.length === 0) {
        Logger.warning(LogContext.STUDY, "Attempted to start a session with an empty list.", { listId });
        setError("This list has no flashcards. Please add cards to it or choose another list.");
        setIsLoading(false);
        return; // Stop execution here.
      }

      const shuffledCards = shuffleArray(data.flashcards);

      await clearResults(data.sessionId); // Clear any old data for this session

      setSessionId(data.sessionId);
      setFlashcards(shuffledCards);
      setCardResults([]);
      setCurrentIndex(0);
      setIsComplete(false);
      setSessionStartTime(Date.now());
      Logger.log(LogContext.STUDY, "Session started successfully.", { sessionId: data.sessionId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      Logger.error(LogContext.STUDY, "Failed to start session.", { listId, error: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeSession = useCallback(async () => {
    if (!sessionId) return;
    // For now, we'll just handle local queuing. Server sync logic can be added later.
    Logger.log(LogContext.STUDY, "Session completed. Queuing for sync.", { sessionId });
    await queueSessionForSync(sessionId);
    setIsComplete(true);
  }, [sessionId]);

  const recordCardResult = useCallback(async (isCorrect: boolean, timeSeconds: number) => {
    if (!sessionId || currentIndex >= flashcards.length) return;

    const currentCard = flashcards[currentIndex];
    const result: CardResult = { sessionId, flashcardId: String(currentCard._id), isCorrect, timeSeconds };

    setCardResults(prev => [...prev, result]);
    await saveResult(result);

    // Instead of incrementing currentIndex, we set the result for the feedback screen.
    setLastCardResult(isCorrect ? 'correct' : 'incorrect');
  }, [sessionId, currentIndex, flashcards]);

  // NEW: This action is called by the feedback screen to advance the session.
  const showNextCard = useCallback(() => {
    setLastCardResult(null); // Hide the feedback screen
    const nextIndex = currentIndex + 1;
    if (nextIndex < flashcards.length) {
      setCurrentIndex(nextIndex);
    } else {
      // If that was the last card, complete the session.
      completeSession();
    }
  }, [currentIndex, flashcards.length, completeSession]);

  const resetSession = useCallback(() => {
    if (sessionId) clearResults(sessionId);
    setSessionId(null);
    setFlashcards([]);
    setCardResults([]);
    setCurrentIndex(0);
    setIsComplete(false);
    setError(null);
    setSessionStartTime(null);
    setLastCardResult(null);
  }, [sessionId]);

  const value = {
    sessionId, isLoading, isComplete, error, flashcards, currentIndex, cardResults,
    sessionStartTime, lastCardResult, startSession, recordCardResult, showNextCard, resetSession,
  };

  return (
    <StudySessionContext.Provider value={value}>{children}</StudySessionContext.Provider>
  );
};

// --- 5. CREATE THE CUSTOM HOOK ---
export const useStudySession = (): StudySessionState => {
  const context = useContext(StudySessionContext);
  if (context === undefined) {
    throw new Error('useStudySession must be used within a StudySessionProvider');
  }
  return context;
};