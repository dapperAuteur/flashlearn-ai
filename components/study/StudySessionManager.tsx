'use client';

import React, { useState, useEffect } from 'react'; // Add useCallback
import { useStudySession } from '@/contexts/StudySessionContext';
import StudySessionSetup from './StudySessionSetup';
import StudyCard from './StudyCard';
import StudySessionResults from './StudySessionResults';
import CardFeedback from './CardFeedback';
import { Logger, LogContext } from '@/lib/logging/client-logger';

// --- (formatTime helper remains the same) ---
const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function StudySessionManager() {
  const {
    sessionId,
    isLoading,
    isComplete,
    error,
    flashcards,
    currentIndex,
    sessionStartTime,
    recordCardResult,
    resetSession,
    lastCardResult,
  } = useStudySession();

  const [elapsedTime, setElapsedTime] = useState(0);
  // NEW: The manager now owns the isFlipped state for the current card.
  const [isFlipped, setIsFlipped] = useState(false);

  // THIS IS THE FIX: This effect *guarantees* that whenever the card changes
  // (i.e., currentIndex changes), the isFlipped state is reset to false.
  // Because the parent controls this, it happens before the child can render.
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  // --- (timer useEffect remains the same) ---
  useEffect(() => {
    if (!sessionStartTime || isComplete) { return; }
    const timerInterval = setInterval(() => {
      setElapsedTime(Date.now() - sessionStartTime);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [sessionStartTime, isComplete]);
  
  // --- (Conditional rendering logic remains the same) ---

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline ml-2">{error}</span>
        <button onClick={resetSession} className="ml-4 mt-2 sm:mt-0 sm:ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Choose Another List
        </button>
      </div>
    );
  }

  if (sessionId) {
    if (isComplete) {
      return <StudySessionResults />;
    }

    if (lastCardResult) {
      return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
          <div className="mb-4 h-5"></div> {/* Placeholder to keep layout consistent */}
          <CardFeedback />
        </div>
      );
    }

    if (flashcards.length > 0 && currentIndex < flashcards.length) {
      return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
          <div className="mb-4 flex justify-between items-center text-white">
            <span>Card {currentIndex + 1} of {flashcards.length}</span>
            <span>Time: {formatTime(elapsedTime)}</span>
            <button onClick={resetSession} className="text-sm text-blue-400 hover:text-blue-300">
              End Session
            </button>
          </div>
          {/* MODIFIED: Pass the new state and handlers down to StudyCard */}
          <StudyCard
            flashcard={flashcards[currentIndex]}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)} // The toggle logic now lives here
            onResult={recordCardResult}
            onPrevious={() => Logger.log(LogContext.STUDY, "Previous card action not implemented.")}
            onEndSession={resetSession}
          />
        </div>
      );
    }
  }

  return <StudySessionSetup />;
}