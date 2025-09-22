'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Flashcard } from '@/types/flashcard';
import { 
  CardResult, 
  saveResult, 
  getResults, 
  clearResults, 
  queueSessionForSync,
  getOfflineSet,
  saveStudyHistory,
  StudySessionHistory
} from '@/lib/db/indexeddb';
import { shuffleArray } from '@/lib/utils/arrayUtils';
import { Logger, LogContext } from '@/lib/logging/client-logger';

type StudyDirection = 'front-to-back' | 'back-to-front';
type LastCardResult = 'correct' | 'incorrect' | null;

interface StudySessionState {
  // Session Status
  sessionId: string | null;
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;

  // Session Data
  flashcardSetName: string | null;
  flashcards: Flashcard[];
  currentIndex: number;
  cardResults: CardResult[];

  // Timer Data
  sessionStartTime: number | null;

  lastCardResult: LastCardResult;

  // studyDirection
  studyDirection: StudyDirection;
  setStudyDirection: (direction: StudyDirection) => void;

  // Confidence State
  currentConfidenceRating: number | null;
  isConfidenceRequired: boolean;
  hasCompletedConfidence: boolean;
  
  // Offline indicator
  isOfflineSession: boolean;
  
  // Actions
  startSession: (listId: string, direction: StudyDirection) => Promise<void>;
  recordCardResult: (isCorrect: boolean, timeSeconds: number, confidenceRating?: number) => Promise<void>;
  recordConfidence: (rating: number) => void;
  showNextCard: () => void;
  resetSession: () => void;
}

const StudySessionContext = createContext<StudySessionState | undefined>(undefined);

export const StudySessionProvider = ({ children }: { children: ReactNode }) => {
  const { data: authSession } = useSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flashcardSetName, setFlashcardSetName] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [studyDirection, setStudyDirection] = useState<StudyDirection>('front-to-back');
  const [lastCardResult, setLastCardResult] = useState<LastCardResult>(null);
  const [isOfflineSession, setIsOfflineSession] = useState(false);

  // Confidence state
  const [currentConfidenceRating, setCurrentConfidenceRating] = useState<number | null>(null);
  
  const isConfidenceRequired = true;
  const hasCompletedConfidence = currentConfidenceRating !== null;

  // Reset confidence when moving to new card
  useEffect(() => {
    setCurrentConfidenceRating(null);
  }, [currentIndex]);

  const startSession = useCallback(async (listId: string, direction: StudyDirection) => {
    setIsLoading(true);
    setError(null);
    setStudyDirection(direction);
    setIsOfflineSession(false);
    
    try {
      Logger.log(LogContext.STUDY, "Attempting to start session", { listId, direction });
      
      // STEP 1: Check offline storage first
      const offlineSet = await getOfflineSet(listId);
      
      if (offlineSet) {
        Logger.log(LogContext.STUDY, "Found offline set, starting offline session", { listId });
        
        if (!offlineSet.flashcards || offlineSet.flashcards.length === 0) {
          setError("This offline set has no flashcards.");
          setIsLoading(false);
          return;
        }

        const shuffledCards = shuffleArray([...offlineSet.flashcards]).map(card => ({
          ...card,
          id: card._id,
          tags: [],
          listId: listId,
          userId: authSession?.user?.id || 'offline-user',
          difficulty: 1,
          lastReviewed: undefined,
          nextReviewDate: undefined,
          correctCount: 0,
          incorrectCount: 0,
          stage: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        const generatedSessionId = `offline-${Date.now()}-${listId}`;

        await clearResults(generatedSessionId);

        setSessionId(generatedSessionId);
        setFlashcards(shuffledCards);
        setFlashcardSetName(offlineSet.title);
        setCardResults([]);
        setCurrentIndex(0);
        setIsComplete(false);
        setSessionStartTime(Date.now());
        setCurrentConfidenceRating(null);
        setIsOfflineSession(true);
        
        Logger.log(LogContext.STUDY, "Offline session started successfully", { sessionId: generatedSessionId });
        setIsLoading(false);
        return;
      }

      // STEP 2: If not offline, try online API
      if (!navigator.onLine) {
        setError("No internet connection and this set is not available offline. Please enable offline mode for this set when online.");
        setIsLoading(false);
        return;
      }

      Logger.log(LogContext.STUDY, "No offline set found, trying online API", { listId });
      
      const response = await fetch('/api/study/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start study session');
      }

      const data: { sessionId: string; setName: string; flashcards: Flashcard[] } = await response.json();

      if (!data.flashcards || data.flashcards.length === 0) {
        Logger.warning(LogContext.STUDY, "Attempted to start session with empty list", { listId });
        setError("This list has no flashcards. Please add cards to it or choose another list.");
        setIsLoading(false);
        return;
      }

      const shuffledCards = shuffleArray(data.flashcards);

      await clearResults(data.sessionId);

      setSessionId(data.sessionId);
      setFlashcards(shuffledCards);
      setFlashcardSetName(data.setName);
      setCardResults([]);
      setCurrentIndex(0);
      setIsComplete(false);
      setSessionStartTime(Date.now());
      setCurrentConfidenceRating(null);
      setIsOfflineSession(false);
      
      Logger.log(LogContext.STUDY, "Online session started successfully", { sessionId: data.sessionId });
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      Logger.error(LogContext.STUDY, "Failed to start session", { listId, error: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeSession = useCallback(async () => {
    if (!sessionId || !sessionStartTime) return;

    console.log('completeSession - cardResults length:', cardResults.length);
    
    try {
      const freshResults = await getResults(sessionId);
      console.log('completeSession - fresh results from IndexedDB:', freshResults);
      
      setCardResults(freshResults);

      // Create study history entry
      const historyEntry: StudySessionHistory = {
        sessionId,
        setId: String(flashcards[0]?.listId) || 'unknown',
        setName: flashcardSetName || 'Unknown Set',
        startTime: new Date(sessionStartTime),
        endTime: new Date(),
        totalCards: flashcards.length,
        correctCount: freshResults.filter(r => r.isCorrect).length,
        incorrectCount: freshResults.filter(r => !r.isCorrect).length,
        accuracy: freshResults.length > 0 
          ? (freshResults.filter(r => r.isCorrect).length / freshResults.length) * 100 
          : 0,
        durationSeconds: Math.round(freshResults.reduce((total, result) => total + result.timeSeconds, 0)),
        isOfflineSession
      };

      // Save to study history
      await saveStudyHistory(historyEntry);
      Logger.log(LogContext.STUDY, "Study history saved", { sessionId });

      // Sync to server if online and authenticated
      if (authSession?.user?.id && flashcards.length > 0 && navigator.onLine) {
        try {
          await fetch('/api/study/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              setId: flashcards[0]?.listId,
              results: freshResults
            })
          });
          Logger.log(LogContext.STUDY, "Session synced to server", { sessionId });
        } catch (error) {
          Logger.error(LogContext.STUDY, "Failed to sync session to server", { error });
        }
      }
      
      await queueSessionForSync(sessionId);
      setIsComplete(true);
      setTimeout(() => {
        window.location.href = `/study/results/${sessionId}`;
      }, 100);
      
    } catch (error) {
      Logger.error(LogContext.STUDY, "Error completing session", { error });
      setIsComplete(true);
    }
  }, [sessionId, authSession, flashcards, cardResults, sessionStartTime, flashcardSetName, isOfflineSession]); 

  const recordConfidence = useCallback((rating: number) => {
    if (rating < 1 || rating > 5) return;
    setCurrentConfidenceRating(rating);
    Logger.log(LogContext.STUDY, "Confidence rating recorded", { rating });
  }, []);

  const recordCardResult = useCallback(async (isCorrect: boolean, timeSeconds: number, confidenceRating?: number) => {
    if (!sessionId || currentIndex >= flashcards.length) return;

    const currentCard = flashcards[currentIndex];
    const finalConfidenceRating = confidenceRating || currentConfidenceRating;
    
    const result: CardResult = { 
      sessionId, 
      flashcardId: String(currentCard._id), 
      isCorrect, 
      timeSeconds,
      confidenceRating: finalConfidenceRating ?? undefined
    };

    console.log('recordCardResult - creating result:', result);

    setCardResults(prev => {
      const newResults = [...prev, result];
      console.log('recordCardResult - updated cardResults:', newResults);
      return newResults;
    });
    
    await saveResult(result);
    setLastCardResult(isCorrect ? 'correct' : 'incorrect');
  }, [sessionId, currentIndex, flashcards, currentConfidenceRating]);

  const showNextCard = useCallback(() => {
    setLastCardResult(null);
    setCurrentConfidenceRating(null);
    const nextIndex = currentIndex + 1;
    if (nextIndex < flashcards.length) {
      setCurrentIndex(nextIndex);
    } else {
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
    setCurrentConfidenceRating(null);
    setIsOfflineSession(false);
    Logger.log(LogContext.STUDY, "Session reset");
  }, [sessionId]);

  const value = {
    sessionId,
    flashcardSetName,
    isLoading,
    isComplete,
    error,
    flashcards,
    currentIndex,
    cardResults,
    sessionStartTime,
    lastCardResult,
    startSession,
    recordCardResult,
    showNextCard,
    resetSession,
    studyDirection,
    setStudyDirection,
    currentConfidenceRating,
    isConfidenceRequired,
    hasCompletedConfidence,
    recordConfidence,
    isOfflineSession,
  };

  return (
    <StudySessionContext.Provider value={value}>{children}</StudySessionContext.Provider>
  );
};

export const useStudySession = (): StudySessionState => {
  const context = useContext(StudySessionContext);
  if (context === undefined) {
    throw new Error('useStudySession must be used within a StudySessionProvider');
  }
  return context;
};