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
  saveStudyHistory,
  StudySessionHistory
} from '@/lib/db/indexeddb';
import { syncSession } from '@/lib/sync/session-sync';
import { shuffleArray } from '@/lib/utils/arrayUtils';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { PowerSyncFlashcard, PowerSyncFlashcardSet } from '@/lib/powersync/schema';
import { getPowerSync } from '@/lib/powersync/client';


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
  
  // Sync status
  isSyncing: boolean;
  syncError: string | null;
  
  // Actions
  startSession: (listId: string, direction: StudyDirection) => Promise<void>;
  recordCardResult: (isCorrect: boolean, timeSeconds: number, confidenceRating?: number) => Promise<void>;
  recordConfidence: (rating: number) => void;
  completeConfidence: () => void;
  nextCard: () => void;
  resetSession: () => void;
}

const StudySessionContext = createContext<StudySessionState | undefined>(undefined);

export function StudySessionProvider({ children }: { children: ReactNode }) {
  const { data: authSession } = useSession();
  
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Session data
  const [flashcardSetName, setFlashcardSetName] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);
  
  // Timer
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  
  // Last card result
  const [lastCardResult, setLastCardResult] = useState<LastCardResult>(null);
  
  // Study direction
  const [studyDirection, setStudyDirection] = useState<StudyDirection>('front-to-back');
  
  // Confidence tracking
  const [currentConfidenceRating, setCurrentConfidenceRating] = useState<number | null>(null);
  const [isConfidenceRequired] = useState(true);
  const [hasCompletedConfidence, setHasCompletedConfidence] = useState(false);
  
  // Offline indicator
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  
  // Sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const startSession = useCallback(async (listId: string, direction: StudyDirection) => {
    try {
      setIsLoading(true);
      setError(null);
      setStudyDirection(direction);
      
      const newSessionId = `${listId}_${Date.now()}`;
      const isOffline = !navigator.onLine;
      
      Logger.log(LogContext.STUDY, "Starting new study session", { 
        listId, 
        sessionId: newSessionId,
        direction,
        isOffline
      });

      // Fetch flashcards
      let fetchedFlashcards: Flashcard[] = [];
      let setName = 'Study Set';

      if (authSession?.user?.id && !isOffline) {
        try {
          const response = await fetch(`/api/lists/${listId}`);
          if (response.ok) {
            const data = await response.json();
            fetchedFlashcards = data.flashcards || [];
            setName = data.name || data.title || 'Study Set';
          }
        } catch (err) {
          Logger.warning(LogContext.STUDY, "Failed to fetch from API, checking PowerSync", { error: err });
        }
      }

      // Fallback to PowerSync
      if (fetchedFlashcards.length === 0) {
        try {
          const powerSync = getPowerSync();
          const results = await powerSync.getAll<PowerSyncFlashcard>(
            'SELECT * FROM flashcards WHERE set_id = ? AND is_deleted = 0',
            [listId]
          );
          
          fetchedFlashcards = results.map(card => ({
            _id: card.id,
            listId: card.set_id,
            front: card.front,
            back: card.back,
            frontImage: card.front_image || undefined,
            backImage: card.back_image || undefined,
          }));

          const setResults = await powerSync.getAll<PowerSyncFlashcardSet>(
            'SELECT * FROM flashcard_sets WHERE id = ?',
            [listId]
          );
          
          if (setResults.length > 0) {
            setName = setResults[0].title;
          }
        } catch (err) {
          Logger.error(LogContext.STUDY, "PowerSync fetch failed", { error: err });
        }
      }

      if (fetchedFlashcards.length === 0) {
        throw new Error('No flashcards found for this set');
      }

      const shuffled = shuffleArray([...fetchedFlashcards]);
      
      setSessionId(newSessionId);
      setFlashcards(shuffled);
      setFlashcardSetName(setName);
      setCurrentIndex(0);
      setCardResults([]);
      setSessionStartTime(Date.now());
      setIsOfflineSession(isOffline);
      setIsComplete(false);
      setLastCardResult(null);
      setCurrentConfidenceRating(null);
      setHasCompletedConfidence(false);
      
      Logger.log(LogContext.STUDY, "Session started successfully", { 
        sessionId: newSessionId,
        cardCount: shuffled.length,
        setName
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      Logger.error(LogContext.STUDY, "Error starting session", { error: errorMessage });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [authSession]);

  const completeSession = useCallback(async () => {
    if (!sessionId || !sessionStartTime) {
      Logger.warning(LogContext.STUDY, "Cannot complete session - missing sessionId or startTime");
      return;
    }

    try {
      Logger.log(LogContext.STUDY, "Starting session completion", { sessionId });
      
      // CRITICAL: Get fresh results from IndexedDB to ensure we have all data
      const freshResults = await getResults(sessionId);
      
      if (freshResults.length === 0) {
        Logger.warning(LogContext.STUDY, "No results found in IndexedDB", { sessionId });
      }

      const correctCount = freshResults.filter(r => r.isCorrect).length;
      const incorrectCount = freshResults.filter(r => !r.isCorrect).length;
      const totalTime = Math.round((Date.now() - sessionStartTime) / 1000);

      const historyEntry: StudySessionHistory = {
        sessionId,
        setId: flashcards[0]?.listId || 'unknown',
        setName: flashcardSetName || 'Study Set',
        startTime: new Date(sessionStartTime),
        endTime: new Date(),
        totalCards: flashcards.length,
        correctCount,
        incorrectCount,
        accuracy: freshResults.length > 0 
          ? (correctCount / freshResults.length) * 100 
          : 0,
        durationSeconds: totalTime,
        isOfflineSession
      };

      // CRITICAL: Save to study history and wait for completion
      await saveStudyHistory(historyEntry);
      Logger.log(LogContext.STUDY, "Study history saved successfully", { sessionId });

      // CRITICAL: Queue for sync BEFORE attempting server sync
      await queueSessionForSync(sessionId);
      Logger.log(LogContext.STUDY, "Session queued for sync", { sessionId });

      // Sync to server if online and authenticated
      if (authSession?.user?.id && navigator.onLine) {
        setIsSyncing(true);
        setSyncError(null);
        
        try {
          const syncSuccess = await syncSession(sessionId);
          
          if (syncSuccess) {
            Logger.log(LogContext.STUDY, "Session synced to server immediately", { sessionId });
          } else {
            Logger.warning(LogContext.STUDY, "Immediate sync failed, will retry in background", { sessionId });
            setSyncError("Results saved locally. Will sync when connection improves.");
          }
        } catch (error) {
          Logger.error(LogContext.STUDY, "Sync error during completion", { error });
          setSyncError("Results saved locally. Will sync later.");
        } finally {
          setIsSyncing(false);
        }
      }

      // CRITICAL: Mark as complete ONLY after all save operations
      setIsComplete(true);
      
      // Navigate to results page after a brief delay to ensure state updates
      setTimeout(() => {
        Logger.log(LogContext.STUDY, "Navigating to results page", { sessionId });
        window.location.href = `/study/results/${sessionId}`;
      }, 200);
      
    } catch (error) {
      Logger.error(LogContext.STUDY, "Error completing session", { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId 
      });
      setError("Failed to save results. Please try again.");
      setIsComplete(false);
    }
  }, [sessionId, authSession, flashcards, sessionStartTime, flashcardSetName, isOfflineSession]);

  const recordConfidence = useCallback((rating: number) => {
    if (rating < 1 || rating > 5) {
      Logger.warning(LogContext.STUDY, "Invalid confidence rating", { rating });
      return;
    }
    setCurrentConfidenceRating(rating);
    Logger.log(LogContext.STUDY, "Confidence rating recorded", { rating });
  }, []);

  const completeConfidence = useCallback(() => {
    setHasCompletedConfidence(true);
    Logger.log(LogContext.STUDY, "Confidence step completed");
  }, []);

  const recordCardResult = useCallback(async (
    isCorrect: boolean, 
    timeSeconds: number, 
    confidenceRating?: number
  ) => {
    if (!sessionId || currentIndex >= flashcards.length) {
      Logger.warning(LogContext.STUDY, "Cannot record result - invalid state", {
        sessionId,
        currentIndex,
        flashcardsLength: flashcards.length
      });
      return;
    }

    const currentCard = flashcards[currentIndex];
    const finalConfidenceRating = confidenceRating || currentConfidenceRating;
    
    const result: CardResult = { 
      sessionId, 
      flashcardId: String(currentCard._id), 
      isCorrect, 
      timeSeconds,
      confidenceRating: finalConfidenceRating ?? undefined
    };

    Logger.log(LogContext.STUDY, "Recording card result", {
      flashcardId: result.flashcardId,
      isCorrect,
      timeSeconds,
      confidenceRating: finalConfidenceRating
    });

    // Update state immediately
    setCardResults(prev => {
      const newResults = [...prev, result];
      Logger.log(LogContext.STUDY, "Card results updated", { 
        count: newResults.length,
        totalCards: flashcards.length
      });
      return newResults;
    });
    
    // Save to IndexedDB
    try {
      await saveResult(result);
      Logger.log(LogContext.STUDY, "Result saved to IndexedDB", { 
        flashcardId: result.flashcardId 
      });
    } catch (error) {
      Logger.error(LogContext.STUDY, "Failed to save result to IndexedDB", { error });
    }
    
    setLastCardResult(isCorrect ? 'correct' : 'incorrect');
    setCurrentConfidenceRating(null);
    setHasCompletedConfidence(false);

    // Check if this was the last card
    if (currentIndex === flashcards.length - 1) {
      Logger.log(LogContext.STUDY, "Last card completed, initiating session completion");
      await completeSession();
    }
  }, [sessionId, currentIndex, flashcards, currentConfidenceRating, completeSession]);

  const nextCard = useCallback(() => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setLastCardResult(null);
      setCurrentConfidenceRating(null);
      setHasCompletedConfidence(false);
      Logger.log(LogContext.STUDY, "Advanced to next card", { 
        newIndex: currentIndex + 1,
        totalCards: flashcards.length
      });
    }
  }, [currentIndex, flashcards.length]);

  const resetSession = useCallback(() => {
    Logger.log(LogContext.STUDY, "Resetting session", { sessionId });
    setSessionId(null);
    setFlashcards([]);
    setFlashcardSetName(null);
    setCurrentIndex(0);
    setCardResults([]);
    setSessionStartTime(null);
    setIsComplete(false);
    setError(null);
    setLastCardResult(null);
    setCurrentConfidenceRating(null);
    setHasCompletedConfidence(false);
    setIsOfflineSession(false);
    setIsSyncing(false);
    setSyncError(null);
  }, [sessionId]);

  const value: StudySessionState = {
    sessionId,
    isLoading,
    isComplete,
    error,
    flashcardSetName,
    flashcards,
    currentIndex,
    cardResults,
    sessionStartTime,
    lastCardResult,
    studyDirection,
    setStudyDirection,
    currentConfidenceRating,
    isConfidenceRequired,
    hasCompletedConfidence,
    isOfflineSession,
    isSyncing,
    syncError,
    startSession,
    recordCardResult,
    recordConfidence,
    completeConfidence,
    nextCard,
    resetSession,
  };

  return (
    <StudySessionContext.Provider value={value}>
      {children}
    </StudySessionContext.Provider>
  );
}

export function useStudySession() {
  const context = useContext(StudySessionContext);
  if (!context) {
    throw new Error('useStudySession must be used within StudySessionProvider');
  }
  return context;
}
