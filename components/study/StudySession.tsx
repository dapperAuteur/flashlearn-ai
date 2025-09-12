/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSync } from '@/hooks/useSync'; // Import the useSync hook
import StudySessionSetup from './StudySessionSetup';
import StudyCard from './StudyCard';
import StudySessionResults from './StudySessionResults';
import { Flashcard } from '@/types/flashcard';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { CardResult, saveResult, getResults, clearResults, queueSessionForSync } from '@/lib/db/indexeddb';

export default function StudySession() {
  const { data: authSession } = useSession();
  const { isOnline } = useSync(); // Get the online status
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to load results from IndexedDB remains the same
  useEffect(() => {
    if (sessionId) {
      const loadPersistedResults = async () => {
        try {
          const persistedResults = await getResults(sessionId);
          if (persistedResults.length > 0) {
            setCardResults(persistedResults);
            setCurrentIndex(persistedResults.length);
            Logger.log(LogContext.STUDY, "Resumed session with persisted results", { sessionId });
          }
        } catch (dbError) {
          Logger.error(LogContext.STUDY, "Error loading saved progress", { sessionId, dbError });
          setError(`Could not load saved progress. Error: ${dbError}`);
        }
      };
      loadPersistedResults();
    }
  }, [sessionId]);

  // handleStartSession remains the same
  const handleStartSession = async (newSessionId: string, cards: Flashcard[]) => {
    Logger.log(LogContext.STUDY, "Study session started", { sessionId: newSessionId, cardCount: cards.length });
    await clearResults(newSessionId);
    setSessionId(newSessionId);
    setFlashcards(cards);
    setCardResults([]);
    setCurrentIndex(0);
    setIsComplete(false);
    setError(null);
  };

  // recordCardResult remains the same
  const recordCardResult = async (isCorrect: boolean, timeSeconds: number) => {
    if (!sessionId) return;
    const currentCard = flashcards[currentIndex];
    if (!currentCard?._id) {
        setError("Cannot record result: flashcard ID is missing.");
        return;
    }
    const result: CardResult = { sessionId, flashcardId: String(currentCard._id), isCorrect, timeSeconds };
    setCardResults(prev => [...prev, result]);
    await saveResult(result);
    const nextIndex = currentIndex + 1;
    if (nextIndex < flashcards.length) {
      setCurrentIndex(nextIndex);
    } else {
      await completeSession([...cardResults, result]);
    }
  };

  /**
   * **MODIFIED: Completes the session and intelligently handles online/offline state.**
   */
  const completeSession = async (finalResults: CardResult[]) => {
    if (!sessionId) return;

    // Check if the user is authenticated and online
    if (authSession?.user && isOnline) {
      try {
        Logger.log(LogContext.STUDY, "Attempting to submit session results to server.", { sessionId });
        // there isn't a 'study-sessions' directory in the api?
        const response = await fetch(`/api/study-sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, results: finalResults })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to submit session results');
        }

        Logger.log(LogContext.STUDY, "Successfully submitted session results.", { sessionId });
        // Clear the results from local storage now that they are saved on the server
        await clearResults(sessionId);

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error submitting results';
        setError(`Could not sync results: ${message}. Your progress is saved locally and will be synced later.`);
        Logger.error(LogContext.STUDY, `API Error: ${message}`, { sessionId });
        // If the API fails for any reason, queue the session for a later sync attempt.
        await queueSessionForSync(sessionId);
      }
    } else {
        // For offline users or anonymous users, queue the session for later.
        Logger.log(LogContext.STUDY, "Session completed offline. Queuing for later sync.", { sessionId, isOnline, isAuthenticated: !!authSession?.user });
        await queueSessionForSync(sessionId);
    }

    setIsComplete(true);
  };

  // handleReset and getFinalResults remain the same
  const handleReset = () => {
    setSessionId(null);
    setFlashcards([]);
    setCardResults([]);
    setCurrentIndex(0);
    setIsComplete(false);
    setError(null);
  };
  const getFinalResults = () => {
      if (!isComplete || !sessionId) return null;
      const completedCards = cardResults.length;
      const correctCount = cardResults.filter(r => r.isCorrect).length;
      const incorrectCount = completedCards - correctCount;
      const accuracy = completedCards > 0 ? (correctCount / completedCards) * 100 : 0;
      const durationSeconds = Math.round(cardResults.reduce((total, result) => total + result.timeSeconds, 0));
      return { sessionId, totalCards: flashcards.length, completedCards, correctCount, incorrectCount, accuracy, durationSeconds };
  };

  // The renderContent function remains the same
  const renderContent = () => {
    if (error) {
      return (
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded mb-4">
            {error}
          </div>
          <button onClick={handleReset} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Start Over
          </button>
        </div>
      );
    }
    if (!sessionId) { return <StudySessionSetup onStartSession={handleStartSession} />; }
    if (isComplete) {
      const finalResults = getFinalResults();
      if (!finalResults) { return <div>Could not calculate results.</div>; }
      return <StudySessionResults results={finalResults} onReset={handleReset} />;
    }
    if (flashcards.length === 0) { return <div>No flashcards available.</div>; }
    return (
      <div className="bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-4 flex justify-between items-center">
          <div className="text-white">Card {currentIndex + 1} of {flashcards.length}</div>
          <button onClick={handleReset} className="text-blue-400 hover:text-blue-300">Exit Session</button>
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
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {renderContent()}
    </div>
  );
}
