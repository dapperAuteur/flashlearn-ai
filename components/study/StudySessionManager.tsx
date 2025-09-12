'use client';

import React, { useState, useEffect } from 'react';
import { useStudySession } from '@/contexts/StudySessionContext';
import StudySessionSetup from './StudySessionSetup';
import StudyCard from './StudyCard';
import StudySessionResults from './StudySessionResults';
import { Logger, LogContext } from '@/lib/logging/client-logger';

// Helper function to format time from milliseconds to MM:SS
const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function StudySessionManager() {
  // 1. Connect to the centralized state via our custom hook.
  const {
    sessionId,
    isLoading,
    isComplete,
    error,
    flashcards,
    currentIndex,
    cardResults,
    sessionStartTime,
    recordCardResult,
    resetSession,
  } = useStudySession();

  const [elapsedTime, setElapsedTime] = useState(0);

  // 2. Effect for managing the session timer.
  useEffect(() => {
    if (!sessionStartTime || isComplete) {
      return; // Do nothing if the session hasn't started or is over.
    }

    // Set up an interval to update the elapsed time every second.
    const timerInterval = setInterval(() => {
      setElapsedTime(Date.now() - sessionStartTime);
    }, 1000);

    // Cleanup function: This is crucial to prevent memory leaks.
    // It runs when the component unmounts or the dependencies change.
    return () => clearInterval(timerInterval);
  }, [sessionStartTime, isComplete]); // Re-run effect if the session starts or completes.

  // 3. Conditional rendering logic based on the context's state.

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
        <button onClick={resetSession} className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Try Again
        </button>
      </div>
    );
  }

  if (isComplete && sessionId) {
    // Prepare the results object for the results component.
    const results = {
      sessionId,
      totalCards: flashcards.length,
      completedCards: cardResults.length,
      correctCount: cardResults.filter(r => r.isCorrect).length,
      incorrectCount: cardResults.filter(r => !r.isCorrect).length,
      accuracy: cardResults.length > 0 ? (cardResults.filter(r => r.isCorrect).length / cardResults.length) * 100 : 0,
      durationSeconds: Math.round((cardResults.reduce((total, result) => total + result.timeSeconds, 0))),
    };
    return <StudySessionResults results={results} onReset={resetSession} />;
  }

  if (sessionId && flashcards.length > 0) {
    // This is the main, active study session view.
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
        <div className="mb-4 flex justify-between items-center text-white">
          <span>Card {currentIndex + 1} of {flashcards.length}</span>
          <span>Time: {formatTime(elapsedTime)}</span>
          <button onClick={resetSession} className="text-sm text-blue-400 hover:text-blue-300">
            End Session
          </button>
        </div>
        <StudyCard
          flashcard={flashcards[currentIndex]}
          onResult={recordCardResult}
          // Stubbing out unimplemented features for now.
          onPrevious={() => Logger.log(LogContext.STUDY, "Previous card action not implemented.")}
          onEndSession={resetSession}
        />
      </div>
    );
  }

  // The default view: show the setup component if no session is active.
  return <StudySessionSetup />;
}