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
  const { data: authSession } = useSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setError(`Could not load saved progress.`);
        }
      };
      loadPersistedResults();
    }
  }, [sessionId]);

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

  const recordCardResult = async (isCorrect: boolean, timeSeconds: number) => {
    if (!sessionId) return;
    const currentCard = flashcards[currentIndex];
    if (!currentCard?._id) {
        setError("Cannot record result: flashcard ID is missing.");
        return;
    }
    const result: CardResult = { sessionId, flashcardId: String(currentCard._id), isCorrect, timeSeconds };
    const newResults = [...cardResults, result];
    setCardResults(newResults);
    await saveResult(result);
    const nextIndex = currentIndex + 1;
    if (nextIndex < flashcards.length) {
      setCurrentIndex(nextIndex);
    } else {
      await completeSession(newResults);
    }
  };

  const completeSession = async (finalResults: CardResult[]) => {
    if (!sessionId) return;
    if (authSession?.user) {
      try {
        const response = await fetch(`/api/study/sessions/${sessionId}/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalResults)
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to submit session results');
        }
        Logger.log(LogContext.STUDY, "Successfully submitted session results", { sessionId });
        await clearResults(sessionId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(message);
        Logger.error(LogContext.STUDY, `API Error: ${message}`, { sessionId });
      }
    } else {
        Logger.log(LogContext.STUDY, "Session completed offline.", { sessionId });
    }
    setIsComplete(true);
  };

  const handleReset = () => {
    setSessionId(null); setFlashcards([]); setCardResults([]);
    setCurrentIndex(0); setIsComplete(false); setError(null);
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

  const renderContent = () => {
    if (error) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
            <p className="font-bold">An Error Occurred</p>
            <p>{error}</p>
          </div>
          <button onClick={handleReset} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
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
      if (!finalResults) return null;
      return <StudySessionResults results={finalResults} onReset={handleReset} />;
    }
    
    if (flashcards.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <p className="text-gray-700 mb-4">No flashcards available for this list.</p>
                <button onClick={handleReset} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Back to Setup
                </button>
            </div>
        );
    }

    return (
      <div className="w-full">
        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm font-medium text-gray-600">
            Card {currentIndex + 1} of {flashcards.length}
          </div>
          <button onClick={handleReset} className="text-sm text-blue-600 hover:underline">
            Exit Session
          </button>
        </div>
        <StudyCard
          flashcard={flashcards[currentIndex]}
          onResult={recordCardResult}
        />
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {renderContent()}
    </div>
  );
}