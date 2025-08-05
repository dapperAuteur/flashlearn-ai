/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSync } from '@/hooks/useSync';
import StudyCard from './StudyCard';
import StudySessionResults from './StudySessionResults';
import { Flashcard } from '@/types/flashcard';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { useToast } from '@/hooks/use-toast';
import {
  CardResult,
  saveResult,
  getOfflineDeck,
  createOfflineSession,
  completeOfflineSession,
} from '@/lib/db/indexeddb';
import { Button } from '../ui/button';

/**
 * Shuffles an array in-place using the Fisher-Yates algorithm.
 * @param array The array to shuffle.
 */
const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};


export default function StudySession() {
  const { isOnline } = useSync();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [setId, setSetId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect to initialize the study session from URL or other sources
  useEffect(() => {
    const currentSetId = searchParams.get('setId');
    if (currentSetId) {
      setSetId(currentSetId);
      handleStartSession(currentSetId);
    } else {
      setError("No flashcard set ID provided.");
      setIsLoading(false);
    }
  }, [searchParams]);


  /**
   * Starts a new study session.
   * It first attempts to load the deck from IndexedDB for offline use.
   * If not available offline, it falls back to fetching from the API if online.
   */
  const handleStartSession = useCallback(async (currentSetId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. OFFLINE-FIRST: Try to get the deck from IndexedDB
      const offlineDeck = await getOfflineDeck(currentSetId);
      if (offlineDeck) {
        Logger.log(LogContext.STUDY, "Starting session with offline deck.", { setId: currentSetId });
        const newSessionId = await createOfflineSession(currentSetId);
        setSessionId(newSessionId);
        setFlashcards(shuffleArray([...offlineDeck.flashcards]));
      } 
      // 2. ONLINE FALLBACK: If not offline, and user is online, fetch from API
      else if (isOnline) {
        Logger.log(LogContext.STUDY, "Deck not found offline. Fetching from API.", { setId: currentSetId });
        const response = await fetch('/api/study/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listId: currentSetId }), // 'listId' is used by the API route
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start session.");
        }
        
        const sessionData = await response.json();
        const newSessionId = await createOfflineSession(currentSetId);
        setSessionId(newSessionId);
        // The API route already shuffles the cards for us
        setFlashcards(sessionData.flashcards);
      }
      // 3. OFFLINE AND NOT DOWNLOADED: User is offline and deck isn't saved
      else {
        throw new Error("You are offline. Please download this deck first to study it.");
      }
    } catch (err: any) {
      const message = err.message || "An unknown error occurred.";
      setError(message);
      Logger.error(LogContext.STUDY, "Failed to start study session", { error: message });
    } finally {
      setIsLoading(false);
      setCardResults([]);
      setCurrentIndex(0);
      setIsComplete(false);
    }
  }, [isOnline]);

  /**
   * Records the result of a single card interaction.
   */
  const recordCardResult = async (isCorrect: boolean, timeSeconds: number) => {
    if (!sessionId) return;
    
    const currentCard = flashcards[currentIndex];
    if (!currentCard?._id) {
        setError("Cannot record result: flashcard ID is missing.");
        return;
    }

    const result: CardResult = { sessionId, flashcardId: String(currentCard._id), isCorrect, timeSeconds };
    
    // Save to state and IndexedDB
    setCardResults(prev => [...prev, result]);
    await saveResult(result);

    // Move to next card or complete the session
    const nextIndex = currentIndex + 1;
    if (nextIndex < flashcards.length) {
      setCurrentIndex(nextIndex);
    } else {
      await completeSession();
    }
  };

  /**
   * Finalizes the session, marking it as complete locally.
   * The sync service will handle uploading the data later.
   */
  const completeSession = async () => {
    if (!sessionId) return;

    // For both online and offline sessions started via this component,
    // we just mark it as complete locally. The sync service handles the rest.
    await completeOfflineSession(sessionId);
    
    Logger.log(LogContext.STUDY, "Session completed. It will be synced later.", { sessionId, isOnline });
    toast({
        title: "Session Complete!",
        description: "Your results have been saved and will sync automatically."
    });

    setIsComplete(true);
  };

  const handleReset = () => {
    if (setId) {
        handleStartSession(setId);
    }
  };

  const getFinalResults = () => {
      if (!isComplete || !sessionId) return null;
      const completedCards = cardResults.length;
      const correctCount = cardResults.filter(r => r.isCorrect).length;
      const incorrectCount = completedCards - correctCount;
      const accuracy = completedCards > 0 ? Math.round((correctCount / completedCards) * 100) : 0;
      const durationSeconds = Math.round(cardResults.reduce((total, result) => total + result.timeSeconds, 0));
      return { sessionId, totalCards: flashcards.length, completedCards, correctCount, incorrectCount, accuracy, durationSeconds };
  };

  // --- RENDER LOGIC ---

  if (isLoading) {
    return <div className="text-center p-10">Loading study session...</div>;
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-6 text-center">
        <h2 className="text-xl text-red-400 mb-4">Error</h2>
        <p className="text-white mb-6">{error}</p>
        <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (isComplete) {
    const finalResults = getFinalResults();
    if (!finalResults) return <div>Could not calculate results.</div>;
    return <StudySessionResults results={finalResults} onReset={handleReset} />;
  }
  
  if (!sessionId || flashcards.length === 0) {
    return <div className="text-center p-10">Could not load flashcards for this session.</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6">
      <div className="mb-4 flex justify-between items-center">
        <div className="text-white">Card {currentIndex + 1} of {flashcards.length}</div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>Exit Session</Button>
      </div>
      <StudyCard
      flashcard={flashcards[currentIndex]}
          onResult={recordCardResult} onPrevious={function (): void {
            throw new Error('Function not implemented.');
          } } onEndSession={function (): void {
            throw new Error('Function not implemented.');
          } } />
    </div>
  );
}
