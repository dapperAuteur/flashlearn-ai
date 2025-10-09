'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Flashcard } from '@/types/flashcard';
import { 
  CardResult, 
  saveResult, 
  getResults, 
  clearResults, 
  saveStudyHistory,
  StudySessionHistory
} from '@/lib/db/indexeddb';
import { shuffleArray } from '@/lib/utils/arrayUtils';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { PowerSyncFlashcard, PowerSyncFlashcardSet } from '@/lib/powersync/schema';
import { getPowerSync } from '@/lib/powersync/client';


export type StudyDirection = 'front-to-back' | 'back-to-front';
type LastCardResult = 'correct' | 'incorrect' | null;

interface StudySessionState {
  // Session Status
  sessionId: string | null;
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;

  // Session Data
  sessionSetId: string;
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
  const [sessionSetId, setSessionSetId] = useState<string>('');

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
    setSessionSetId(listId);
    console.log('listId :>> ', listId);
    console.log('sessionSetId :>> ', sessionSetId);
    
    try {
      Logger.log(LogContext.STUDY, "Attempting to start session", {
        listId,
        direction,
        sessionSetId
      });
      // Try PowerSync first (if available and initialized)
    let set = null;
    let cards: PowerSyncFlashcard[] = [];
    
    try {
      const powerSync = getPowerSync();
      
      if (powerSync) {
        [set] = await powerSync.getAll<PowerSyncFlashcardSet>(
          'SELECT * FROM flashcard_sets WHERE id = ?',
          [listId]
        );

        if (set) {
          cards = await powerSync.getAll<PowerSyncFlashcard>(
            'SELECT * FROM flashcards WHERE set_id = ? ORDER BY "order"',
            [listId]
          );
        }
      }
    } catch (powerSyncError) {
      Logger.log(LogContext.STUDY, "PowerSync not available, falling back to API", { 
        error: powerSyncError 
      });
    }

    // If PowerSync found the set, use it
    if (set && cards.length > 0) {
      Logger.log(LogContext.STUDY, "Found set in PowerSync", { sessionSetId });

      const shuffledCards = shuffleArray([...cards]).map(card => ({
        ...card,
        id: card.id,
        front: card.front,
        back: card.back,
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
      setFlashcardSetName(set.title);
      setCardResults([]);
      setCurrentIndex(0);
      setIsComplete(false);
      setSessionStartTime(Date.now());
      setCurrentConfidenceRating(null);
      setIsOfflineSession(true);
      setSessionSetId(listId);
      
      Logger.log(LogContext.STUDY, "PowerSync session started", { 
        sessionId: generatedSessionId,
        sessionSetId,
        listId
      });
      setIsLoading(false);
      return;
    }

    // Fallback to online API
    if (!navigator.onLine) {
      setError("No internet connection and this set is not available offline.");
      setIsLoading(false);
      return;
    }

    Logger.log(LogContext.STUDY, "Fetching from API", {
      listId,
      sessionSetId
    });
    
    const response = await fetch('/api/study/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listId,
        studyDirection: direction
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to start study session');
    }

    const data: {
      sessionId: string;
      setName: string;
      flashcards: Flashcard[]
    } = await response.json();

    if (!data.flashcards || data.flashcards.length === 0) {
      Logger.warning(LogContext.STUDY, "Empty list", {
        listId,
        sessionSetId,
        data
      });
      setError(`This List has no flashcards.`);
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
    
    Logger.log(LogContext.STUDY, "API session started", {
      sessionId: data.sessionId,
      sessionSetId
    });
    
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    setError(message);
    Logger.error(LogContext.STUDY, "Failed to start session", {
      listId,
      sessionSetId,
      error: message
    });
  } finally {
    setIsLoading(false);
  }
}, [authSession, sessionSetId]);

  const completeSession = useCallback(async () => {
  if (!sessionId || !sessionStartTime) return;

  console.log('completeSession - cardResults length:', cardResults.length, 'listId: ', sessionSetId);
  
  try {
    const freshResults = await getResults(sessionId);
    console.log('completeSession - fresh results from IndexedDB:', freshResults, 'listId: ', sessionSetId);
    
    setCardResults(freshResults);

    const correctCount = freshResults.filter(r => r.isCorrect).length;
    const incorrectCount = freshResults.length - correctCount;
    const accuracy = freshResults.length > 0 
      ? (correctCount / freshResults.length) * 100 
      : 0;
    const durationSeconds = Math.round(
      freshResults.reduce((total, result) => total + result.timeSeconds, 0)
    );

    // Create study history entry for local storage
    const historyEntry: StudySessionHistory = {
      sessionId,
      setId: sessionSetId,
      setName: flashcardSetName || 'Unknown Set',
      studyDirection, // Include study direction
      startTime: new Date(sessionStartTime),
      endTime: new Date(),
      totalCards: flashcards.length,
      correctCount,
      incorrectCount,
      accuracy,
      durationSeconds,
      isOfflineSession
    };

    // Save to local study history (IndexedDB)
    await saveStudyHistory(historyEntry);
    Logger.log(LogContext.STUDY, "Study history saved locally", {
      sessionId,
      sessionSetId
    });

    console.log('sessionSetId :>> ', sessionSetId);

    // NEW: Sync to MongoDB if online and authenticated
    if (authSession?.user?.id && navigator.onLine) {
      try {
        Logger.log(LogContext.STUDY, "Attempting to sync session to MongoDB", { 
          sessionId,
          setId: sessionSetId 
        });

        const syncResponse = await fetch('/api/study/sessions/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            setId: sessionSetId,
            setName: flashcardSetName,
            totalCards: flashcards.length,
            correctCount,
            incorrectCount,
            durationSeconds,
            startTime: new Date(sessionStartTime).toISOString(),
            endTime: new Date().toISOString(),
            studyDirection,
            results: freshResults.map(r => ({
              cardId: r.flashcardId,
              isCorrect: r.isCorrect,
              timeSeconds: r.timeSeconds,
              confidenceRating: r.confidenceRating
            }))
          })
        });

        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          Logger.log(LogContext.STUDY, "✅ Session synced to MongoDB successfully", { 
            sessionId,
            sessionSetId,
            mongoSessionId: syncData.sessionId,
            sessionUpdated: syncData.sessionUpdated,
            created: syncData.created,
            updated: syncData.updated 
          });
        } else {
          const errorData = await syncResponse.json();
          throw new Error(errorData.message || 'Sync failed');
        }
      } catch (syncError) {
        Logger.error(LogContext.STUDY, "Failed to sync session to MongoDB (will retry later)", { 
          error: syncError,
          sessionId,
          sessionSetId
        });
        // Don't block user from seeing results - queue for later sync
      }
    }
    
    setIsComplete(true);
    
    // Navigate to results page
    Logger.log(LogContext.STUDY, "Navigating to results page", { sessionId });
    setTimeout(() => {
      window.location.href = `/study/results/${sessionId}`;
    }, 100);
    
  } catch (error) {
    Logger.error(LogContext.STUDY, "Error completing session", {
      error,
      sessionId,
      sessionSetId
    });
    setError('Failed to save session results');
    setIsComplete(true);
  }
}, [
  sessionId,
  sessionSetId, 
  authSession, 
  flashcards, 
  cardResults, 
  sessionStartTime, 
  flashcardSetName, 
  isOfflineSession,
  studyDirection
]); 

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
      setId: sessionSetId,
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
  }, [sessionId, currentIndex, flashcards, currentConfidenceRating, sessionSetId]);

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
    setSessionSetId('');
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
    sessionSetId,
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