/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import StudySessionSetup from './StudySessionSetup';
import StudyCard from './StudyCard';
import StudySessionResults from './StudySessionResults';
import { Flashcard } from '@/types/flashcard';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { CardResult, saveResult, getResults, clearResults } from '@/lib/db/indexeddb';

export default function StudySession() {
  const { data: authSession } = useSession(); // Get user authentication status
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to load results from IndexedDB if a session is in progress on page load
  useEffect(() => {
    if (sessionId) {
      const loadPersistedResults = async () => {
        try {
          const persistedResults = await getResults(sessionId);
          if (persistedResults.length > 0) {
            setCardResults(persistedResults);
            // Resume from where the user left off
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

  // Starts a new study session
  const handleStartSession = async (newSessionId: string, cards: Flashcard[]) => {
    Logger.log(LogContext.STUDY, "Study session started", {
      sessionId: newSessionId,
      cardCount: cards.length
    });

    // Clear any leftover results from a previous attempt at this session
    await clearResults(newSessionId);

    setSessionId(newSessionId);
    setFlashcards(cards);
    setCardResults([]);
    setCurrentIndex(0);
    setIsComplete(false);
    setError(null);
  };

  // Records a card's result locally and in IndexedDB
  const recordCardResult = async (isCorrect: boolean, timeSeconds: number) => {
    if (!sessionId) return;

    const currentCard = flashcards[currentIndex];
    if (!currentCard?._id) {
        setError("Cannot record result: flashcard ID is missing.");
        return;
    }

    const result: CardResult = {
      sessionId,
      flashcardId: String(currentCard._id),
      isCorrect,
      timeSeconds,
    };

    // Update state and save to IndexedDB for offline persistence
    setCardResults(prev => [...prev, result]);
    await saveResult(result);

    // Move to the next card or complete the session
    const nextIndex = currentIndex + 1;
    if (nextIndex < flashcards.length) {
      setCurrentIndex(nextIndex);
    } else {
      await completeSession([...cardResults, result]);
    }
  };

  // Completes the session and submits results if the user is authenticated
  const completeSession = async (finalResults: CardResult[]) => {
    if (!sessionId) return;

    // For authenticated users, send the batch of results to the server
    if (authSession?.user) {
      try {
        const response = await fetch(`/api/study/sessions/${sessionId}/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Send the entire array of results
          body: JSON.stringify(finalResults)
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to submit session results');
        }

        Logger.log(LogContext.STUDY, "Successfully submitted session results to server", { sessionId });
        // Clear the results from local storage now that they are saved on the server
        await clearResults(sessionId);

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error submitting results';
        setError(message);
        Logger.error(LogContext.STUDY, `API Error: ${message}`, { sessionId });
        // Don't clear IndexedDB on failure, so user can retry
      }
    } else {
        // For unauthenticated users, the results are already saved in IndexedDB.
        // They can be synced later if the user logs in.
        Logger.log(LogContext.STUDY, "Session completed offline for anonymous user.", { sessionId });
    }

    setIsComplete(true);
  };

  // Resets the component to the initial setup screen
  const handleReset = () => {
    setSessionId(null);
    setFlashcards([]);
    setCardResults([]);
    setCurrentIndex(0);
    setIsComplete(false);
    setError(null);
  };

  // Calculate final results from the local state
  const getFinalResults = () => {
      if (!isComplete || !sessionId) return null;

      const completedCards = cardResults.length;
      const correctCount = cardResults.filter(r => r.isCorrect).length;
      const incorrectCount = completedCards - correctCount;
      const accuracy = completedCards > 0 ? (correctCount / completedCards) * 100 : 0;
      const durationSeconds = Math.round(cardResults.reduce((total, result) => total + result.timeSeconds, 0));

      return {
          sessionId,
          totalCards: flashcards.length,
          completedCards,
          correctCount,
          incorrectCount,
          accuracy,
          durationSeconds,
      };
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
            {error}
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Start Over
          </button>
        </div>
      );
    }

    if (!sessionId) {
      return <StudySessionSetup onStartSession={handleStartSession} />;
    }

    if (isComplete) {
      const finalResults = getFinalResults();
      if (!finalResults) {
        return (
          <div className="text-center p-6 text-white">
            <p>Could not calculate results.</p>
            <button onClick={handleReset} className="mt-4 px-4 py-2 bg-blue-600 rounded-md">
              Start Over
            </button>
          </div>
        );
      }
      return <StudySessionResults results={finalResults} onReset={handleReset} />;
    }
    
    if (flashcards.length === 0) {
        return (
            <div className="bg-gray-800 rounded-lg shadow p-6 text-center">
                <p className="text-white mb-4">No flashcards available for this list.</p>
                <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Back to Lists
                </button>
            </div>
        );
    }

    return (
      <div className="bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-4 flex justify-between items-center">
          <div className="text-white">
            Card {currentIndex + 1} of {flashcards.length}
          </div>
          <button
            onClick={handleReset}
            className="text-blue-600 hover:text-blue-800"
          >
            Exit Session
          </button>
        </div>
        <StudyCard
          flashcard={flashcards[currentIndex]}
          onResult={recordCardResult} onPrevious={function (): void {
            throw new Error('Function not implemented.');
          } } onEndSession={function (): void {
            throw new Error('Function not implemented.');
          } }        />
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {renderContent()}
    </div>
  );
}
