/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useStudySession } from '@/contexts/StudySessionContext';
import StudySessionSetup from './StudySessionSetup';
import StudyCard from './StudyCard';
// REMOVED: import StudySessionResults from './StudySessionResults';
import ShareableResultsCard from './ShareableResultsCard'; // IMPORT THE NEW COMPONENT
import CardFeedback from './CardFeedback';
import { Logger, LogContext } from '@/lib/logging/client-logger';

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function StudySessionManager() {
  const {
    sessionId,
    flashcardSetName,
    isLoading,
    isComplete,
    error,
    flashcards,
    currentIndex,
    studyDirection,
    sessionStartTime,
    recordCardResult,
    resetSession,
    lastCardResult,
    cardResults, // Get cardResults to build the results object
  } = useStudySession();
  const { status } = useSession();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!sessionStartTime || isComplete) { return; }
    const timerInterval = setInterval(() => {
      setElapsedTime(Date.now() - sessionStartTime);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [sessionStartTime, isComplete]);
  
  // --- Conditional rendering logic ---

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
    // THIS IS THE FIX: When the session is complete, render the ShareableResultsCard
    if (isComplete) {
      // We need to construct the IStudySession object that the ShareableResultsCard expects
      const resultsData = {
        _id: sessionId,
        listId: 'unknown', // This data isn't in the context, but not critical for display
        userId: 'unknown',
        startTime: new Date(sessionStartTime || 0),
        status: 'completed' as const,
        totalCards: flashcards.length,
        correctCount: cardResults.filter(r => r.isCorrect).length,
        incorrectCount: cardResults.filter(r => !r.isCorrect).length,
        completedCards: cardResults.length,
        durationSeconds: Math.round(cardResults.reduce((total, result) => total + result.timeSeconds, 0)),
      };
      // Cast to any to satisfy the IStudySession document properties we don't have
      return <ShareableResultsCard initialResults={resultsData as any} />;
    }

    if (lastCardResult) {
      return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
          <div className="mb-4 h-5"></div>
          <CardFeedback />
        </div>
      );
    }

    if (flashcards.length > 0 && currentIndex < flashcards.length) {
      const currentCard = flashcards[currentIndex];
      const isInverse = studyDirection === 'back-to-front';
      const canBeInverse = status === 'authenticated';
      const cardToShow = (isInverse && canBeInverse)
        ? { ...currentCard, front: currentCard.back, back: currentCard.front }
        : currentCard;
      return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
          <h3 className="font-bold text-lg truncate text-white mb-2" title={flashcardSetName || 'Study Set'}>
            {flashcardSetName || 'Study Set'}
          </h3>
          <div className="mb-4 flex justify-between items-center text-gray-300">
            <span>Card {currentIndex + 1} of {flashcards.length}</span>
            <span>Time: {formatTime(elapsedTime)}</span>
            <button onClick={resetSession} className="text-sm text-blue-400 hover:text-blue-300">
              End Session
            </button>
          </div>
          <StudyCard
            flashcard={cardToShow}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
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

