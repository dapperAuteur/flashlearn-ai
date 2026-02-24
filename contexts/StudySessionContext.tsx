'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Flashcard } from '@/types/flashcard';
import { 
  CardResult, 
  saveResult, 
  getResults, 
  queueSessionForSync,
  saveStudyHistory,
  StudySessionHistory
} from '@/lib/db/indexeddb';
import { syncSession } from '@/lib/services/syncService';
import { shuffleArray } from '@/lib/utils/arrayUtils';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { PowerSyncFlashcard, PowerSyncFlashcardSet } from '@/lib/powersync/schema';
import { getPowerSync } from '@/lib/powersync/client';
import { generateMongoId } from '@/lib/powersync/helpers';


type StudyDirection = 'front-to-back' | 'back-to-front';
type StudyMode = 'classic' | 'multiple-choice' | 'type-answer';
type LastCardResult = 'correct' | 'incorrect' | null;

interface StudySessionState {
  sessionId: string | null;
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
  flashcardSetName: string | null;
  flashcards: Flashcard[];
  currentIndex: number;
  cardResults: CardResult[];
  sessionStartTime: number | null;
  lastCardResult: LastCardResult;
  studyDirection: StudyDirection;
  setStudyDirection: (direction: StudyDirection) => void;
  studyMode: StudyMode;
  setStudyMode: (mode: StudyMode) => void;
  multipleChoiceData: Record<string, string[]>;
  currentConfidenceRating: number | null;
  isConfidenceRequired: boolean;
  hasCompletedConfidence: boolean;
  isOfflineSession: boolean;
  isSyncing: boolean;
  syncError: string | null;
  startSession: (listId: string, direction: StudyDirection, cardIds?: string[]) => Promise<void>;
  recordCardResult: (isCorrect: boolean, timeSeconds: number, confidenceRating?: number) => Promise<void>;
  recordConfidence: (rating: number) => void;
  completeConfidence: () => void;
  nextCard: () => void;
  showNextCard: () => void;
  resetSession: () => void;
}

const StudySessionContext = createContext<StudySessionState | undefined>(undefined);

export function StudySessionProvider({ children }: { children: ReactNode }) {
  const { data: authSession } = useSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashcardSetName, setFlashcardSetName] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [lastCardResult, setLastCardResult] = useState<LastCardResult>(null);
  const [studyDirection, setStudyDirection] = useState<StudyDirection>('front-to-back');
  const [studyMode, setStudyMode] = useState<StudyMode>('classic');
  const [multipleChoiceData, setMultipleChoiceData] = useState<Record<string, string[]>>({});
  const [currentConfidenceRating, setCurrentConfidenceRating] = useState<number | null>(null);
  const [isConfidenceRequired] = useState(true);
  const [hasCompletedConfidence, setHasCompletedConfidence] = useState(false);
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const startSession = useCallback(async (listId: string, direction: StudyDirection, cardIds?: string[]) => {
    try {
      setIsLoading(true);
      setError(null);
      setStudyDirection(direction);
      
      const newSessionId = generateMongoId();
      const isOffline = !navigator.onLine;
      
      Logger.log(LogContext.STUDY, "Starting new study session", { 
        listId, 
        sessionId: newSessionId,
        direction,
        isOffline
      });

      let fetchedFlashcards: Flashcard[] = [];
      let setName = 'Study Set';

      // PowerSync first (works offline)
      try {
        const powerSync = getPowerSync();
        const results = await powerSync.getAll<PowerSyncFlashcard>(
          'SELECT * FROM flashcards WHERE set_id = ? ORDER BY "order"',
          [listId]
        );
        
        if (results.length > 0) {
          fetchedFlashcards = results.map(card => ({
            _id: card.id,
            listId: card.set_id,
            front: card.front,
            back: card.back,
            frontImage: card.front_image || undefined,
            backImage: card.back_image || undefined,
            tags: [],
            userId: card.user_id || 'offline-user',
            difficulty: 1,
            correctCount: 0,
            incorrectCount: 0,
            stage: 0,
            createdAt: new Date(card.created_at),
            updatedAt: new Date(card.updated_at),
          }));

          const setResults = await powerSync.getAll<PowerSyncFlashcardSet>(
            'SELECT * FROM flashcard_sets WHERE id = ?',
            [listId]
          );
          
          if (setResults.length > 0) {
            setName = setResults[0].title;
          }
          
          Logger.log(LogContext.STUDY, "Flashcards loaded from PowerSync", { 
            count: fetchedFlashcards.length 
          });
        }
      } catch (err) {
        Logger.warning(LogContext.STUDY, "PowerSync not available, trying API", { error: err });
      }

      // API fallback if online
      if (fetchedFlashcards.length === 0 && !isOffline && authSession?.user?.id) {
        try {
          const response = await fetch(`/api/lists/${listId}`);
          if (response.ok) {
            const data = await response.json();
            fetchedFlashcards = data.flashcards || [];
            setName = data.name || data.title || 'Study Set';
            Logger.log(LogContext.STUDY, "Flashcards loaded from API", { 
              count: fetchedFlashcards.length 
            });
          }
        } catch (err) {
          Logger.error(LogContext.STUDY, "API fetch failed", { error: err });
        }
      }

      if (fetchedFlashcards.length === 0) {
        throw new Error('No flashcards found for this set');
      }

      // Filter to specific cards if cardIds provided (e.g., missed cards or due cards)
      let cardsToStudy = fetchedFlashcards;
      if (cardIds && cardIds.length > 0) {
        const idSet = new Set(cardIds);
        cardsToStudy = fetchedFlashcards.filter(c => idSet.has(String(c._id)));
        if (cardsToStudy.length === 0) {
          throw new Error('None of the requested cards were found in this set');
        }
      }

      const shuffled = shuffleArray([...cardsToStudy]);
      
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

      // Fetch MC distractors if in multiple-choice mode
      if (studyMode === 'multiple-choice' && !isOffline) {
        try {
          const mcCards = shuffled.slice(0, 30).map(c => ({
            id: String(c._id),
            front: c.front,
            back: c.back,
          }));
          const mcRes = await fetch('/api/study/generate-choices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cards: mcCards }),
          });
          if (mcRes.ok) {
            const mcData = await mcRes.json();
            setMultipleChoiceData(mcData.choices || {});
          }
        } catch (err) {
          Logger.warning(LogContext.STUDY, "Failed to fetch MC distractors", { error: err });
        }
      }

      Logger.log(LogContext.STUDY, "Session started successfully", {
        sessionId: newSessionId,
        cardCount: shuffled.length,
        setName,
        studyMode
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      Logger.error(LogContext.STUDY, "Error starting session", { error: errorMessage });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [authSession, studyMode]);

  const completeSession = useCallback(async () => {
    if (!sessionId || !sessionStartTime) {
      Logger.warning(LogContext.STUDY, "Cannot complete session - missing sessionId or startTime");
      return;
    }

    try {
      Logger.log(LogContext.STUDY, "Starting session completion", { sessionId });
      
      const freshResults = await getResults(sessionId);
      
      if (freshResults.length === 0) {
        Logger.warning(LogContext.STUDY, "No results found in IndexedDB", { sessionId });
      }

      const correctCount = freshResults.filter(r => r.isCorrect).length;
      const incorrectCount = freshResults.filter(r => !r.isCorrect).length;
      const totalTime = Math.round((Date.now() - sessionStartTime) / 1000);

      const historyEntry: StudySessionHistory = {
        sessionId,
        setId: flashcards[0]?.listId.toString() || 'unknown',
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
        isOfflineSession,
        studyDirection
      };

      await saveStudyHistory(historyEntry);
      Logger.log(LogContext.STUDY, "Study history saved successfully", { sessionId });

      await queueSessionForSync(sessionId);
      Logger.log(LogContext.STUDY, "Session queued for sync", { sessionId });

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

      setIsComplete(true);
      Logger.log(LogContext.STUDY, "Session completed, results ready to display inline", { sessionId });
      
    } catch (error) {
      Logger.error(LogContext.STUDY, "Error completing session", { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId 
      });
      setError("Failed to save results. Please try again.");
      setIsComplete(false);
    }
  }, [sessionId, sessionStartTime, flashcards, flashcardSetName, isOfflineSession, studyDirection, authSession?.user?.id]);

  const recordConfidence = useCallback((rating: number) => {
    if (rating < 1 || rating > 5) {
      Logger.warning(LogContext.STUDY, "Invalid confidence rating", { rating });
      return;
    }
    setCurrentConfidenceRating(rating);
    setHasCompletedConfidence(true);
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

    setCardResults(prev => {
      const newResults = [...prev, result];
      Logger.log(LogContext.STUDY, "Card results updated", { 
        count: newResults.length,
        totalCards: flashcards.length
      });
      return newResults;
    });
    
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
    setStudyMode('classic');
    setMultipleChoiceData({});
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
    studyMode,
    setStudyMode,
    multipleChoiceData,
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
    showNextCard: nextCard,
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