/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useStudySession } from '@/contexts/StudySessionContext';
import StudySessionSetup from './StudySessionSetup';
import StudySessionResults from './StudySessionResults';
import StudyCard from './StudyCard';
import CardFeedback from './CardFeedback';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

interface StudySessionManagerProps {
  preSelectedSetId?: string;
}

export default function StudySessionManager({ preSelectedSetId }: StudySessionManagerProps) {
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
    recordConfidence,
    resetSession,
    lastCardResult,
    isConfidenceRequired,
    hasCompletedConfidence,
  } = useStudySession();
  const { status } = useSession();
  const router = useRouter();

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
    // Session complete - show results inline
    if (isComplete) {
      return (
        <div className="space-y-6">
          <StudySessionResults />
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={resetSession}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Study Another Set
            </button>
            {status === 'authenticated' && (
              <button
                onClick={() => router.push('/flashcards')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Back to My Sets
              </button>
            )}
          </div>
        </div>
      );
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
            isConfidenceRequired={isConfidenceRequired}
            hasCompletedConfidence={hasCompletedConfidence}
            onConfidenceSelect={recordConfidence}
            canFlip={hasCompletedConfidence}
          />
        </div>
      );
    }
  }

  return <StudySessionSetup preSelectedSetId={preSelectedSetId} />;
}