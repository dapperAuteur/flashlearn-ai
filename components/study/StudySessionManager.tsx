'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useStudySession } from '@/contexts/StudySessionContext';
import StudySessionSetup from './StudySessionSetup';
import StudySessionResults from './StudySessionResults';
import StudyCard from './StudyCard';
import MultipleChoiceCard from './MultipleChoiceCard';
import CardFeedback from './CardFeedback';
import CelebrationModal from './CelebrationModal';
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
  isReviewMode?: boolean;
}

export default function StudySessionManager({ preSelectedSetId, isReviewMode }: StudySessionManagerProps) {
  const {
    sessionId,
    flashcardSetName,
    isLoading,
    isComplete,
    error,
    flashcards,
    currentIndex,
    studyDirection,
    studyMode,
    multipleChoiceData,
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
  const [newAchievements, setNewAchievements] = useState<Array<{ type: string; title: string; description: string; icon: string }>>([]);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // Reset stale session when navigating to study with a new setId
  useEffect(() => {
    if (preSelectedSetId && sessionId && isComplete) {
      resetSession();
    }
  }, [preSelectedSetId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsFlipped(false);
    // Move focus to the card container when a new card appears
    if (cardContainerRef.current) {
      cardContainerRef.current.focus();
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!sessionStartTime || isComplete) { return; }
    const timerInterval = setInterval(() => {
      setElapsedTime(Date.now() - sessionStartTime);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [sessionStartTime, isComplete]);

  // Check achievements when session completes
  useEffect(() => {
    if (isComplete && status === 'authenticated') {
      fetch('/api/study/achievements', { method: 'POST' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.newAchievements?.length > 0) {
            setNewAchievements(data.newAchievements);
          }
        })
        .catch(() => { /* silent */ });
    }
  }, [isComplete, status]);

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
              onClick={() => { resetSession(); router.replace('/study'); }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Study Another Set
            </button>
            {status === 'authenticated' && (
              <button
                onClick={() => { resetSession(); router.push('/flashcards'); }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Back to My Sets
              </button>
            )}
          </div>
          {newAchievements.length > 0 && (
            <CelebrationModal
              achievements={newAchievements}
              onClose={() => setNewAchievements([])}
            />
          )}
        </div>
      );
    }

    // Session end — last card result recorded, waiting for completeSession to finish
    if (lastCardResult && currentIndex === flashcards.length - 1) {
      return (
        <div className="flex-1 min-h-0 flex flex-col bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4">
          <div className="flex-1 flex flex-col items-center justify-center text-white">
            <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
            <p className="text-gray-400 mb-6">Saving your results...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      );
    }

    // Feedback screen between cards
    if (lastCardResult) {
      return (
        <div className="flex-1 min-h-0 flex flex-col bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4">
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

      const modeLabel = studyMode === 'multiple-choice' ? 'Multiple Choice' : 'Classic';

      return (
        <div ref={cardContainerRef} tabIndex={-1} className="flex-1 min-h-0 flex flex-col bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 outline-none" aria-label={`Studying ${flashcardSetName || 'Study Set'}, card ${currentIndex + 1} of ${flashcards.length}`}>
          <div className="flex items-center justify-between gap-2 text-sm text-gray-300 mb-2" aria-live="polite">
            <h3 className="flex-1 min-w-0 truncate font-semibold text-white" title={flashcardSetName || 'Study Set'}>
              {flashcardSetName || 'Study Set'}
            </h3>
            <span className="whitespace-nowrap">{currentIndex + 1}/{flashcards.length}</span>
            <span className="hidden sm:inline text-xs bg-gray-700 px-2 py-0.5 rounded-full">{modeLabel}</span>
            <span className="whitespace-nowrap tabular-nums">{formatTime(elapsedTime)}</span>
            <button onClick={resetSession} className="text-blue-400 hover:text-blue-300 whitespace-nowrap">
              End
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {studyMode === 'multiple-choice' ? (
              <MultipleChoiceCard
                flashcard={cardToShow}
                distractors={multipleChoiceData[String(currentCard._id)] || []}
                onResult={recordCardResult}
                onConfidenceSelect={recordConfidence}
                onEndSession={resetSession}
                isConfidenceRequired={isConfidenceRequired}
                hasCompletedConfidence={hasCompletedConfidence}
              />
            ) : (
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
                canFlip={!isConfidenceRequired || hasCompletedConfidence}
              />
            )}
          </div>
        </div>
      );
    }
  }

  return <StudySessionSetup preSelectedSetId={preSelectedSetId} isReviewMode={isReviewMode} />;
}