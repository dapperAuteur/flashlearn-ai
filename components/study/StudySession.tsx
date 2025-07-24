/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import StudySessionSetup from './StudySessionSetup';
import StudyCard from './StudyCard';
import StudySessionResults from './StudySessionResults';
import { Logger, LogContext } from '@/lib/logging/client-logger';

type Flashcard = {
  id: string;
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
};

export default function StudySession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionResults, setSessionResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Start a new study session
  const handleStartSession = (newSessionId: string, cards: Flashcard[]) => {
    Logger.log(LogContext.STUDY, "Study session started", { 
      sessionId: newSessionId,
      cardCount: cards.length
    });
    
    setSessionId(newSessionId);
    setFlashcards(cards);
    setCurrentIndex(0);
    setIsComplete(false);
    setSessionResults(null);
    setError(null);
  };

  // Handle flashcard result (correct/incorrect)
  const handleCardResult = async (flashcardId: string, isCorrect: boolean, timeSeconds: number) => {
    if (!sessionId) return;

    try {
      // Send result to API
      const response = await fetch(`/api/study/sessions/${sessionId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcardId, isCorrect, timeSeconds })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record result');
      }
      
      // Move to next card or complete session
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        await completeSession();
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error recording result';
      setError(message);
      Logger.error(LogContext.STUDY, `Error recording card result: ${message}`);
    }
  };

  // Complete the study session
  const completeSession = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/study/sessions/${sessionId}/complete`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete session');
      }
      
      const results = await response.json();
      
      Logger.log(LogContext.STUDY, "Study session completed", { 
        sessionId,
        accuracy: results.accuracy,
        totalCards: results.totalCards,
        completedCards: results.completedCards
      });
      
      setSessionResults(results);
      setIsComplete(true);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error completing session';
      setError(message);
      Logger.error(LogContext.STUDY, `Error completing session: ${message}`);
    }
  };

  // Reset the session to start a new one
  const handleReset = () => {
    setSessionId(null);
    setFlashcards([]);
    setCurrentIndex(0);
    setIsComplete(false);
    setSessionResults(null);
    setError(null);
  };

  // Show current UI based on session state
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
      console.log('line 134 sessionId :>> ', sessionId);
      return <StudySessionSetup onStartSession={handleStartSession} />;
    }
    
    if (isComplete) {
      return <StudySessionResults results={sessionResults} onReset={handleReset} />;
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
    console.log('line 155 sessionId :>> ', sessionId);
    
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
          onResult={handleCardResult} 
        />
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {renderContent()}
    </div>
  );
}