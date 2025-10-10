'use client';

import { useEffect, useState } from 'react';
import { useStudySession } from '@/contexts/StudySessionContext';
import StudyCard from './StudyCard';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  setId: string | null;
  onClose: () => void;
}

export default function OfflineStudyModal({ setId, onClose }: Props) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const {
    sessionId,
    flashcards,
    currentIndex,
    isComplete,
    currentConfidenceRating,
    isConfidenceRequired,
    hasCompletedConfidence,
    recordConfidence,
    recordCardResult,
    showNextCard,
    startSession,
    resetSession
  } = useStudySession();

  const handleResult = async (isCorrect: boolean) => {
    const timeSeconds = (Date.now() - startTime) / 1000;
    await recordCardResult(isCorrect, timeSeconds, currentConfidenceRating || undefined);
    setIsFlipped(false);
    setStartTime(Date.now());
    showNextCard();
  };

  useEffect(() => {
    if (setId && !sessionId) {
      startSession(setId, 'front-to-back');
    }
  }, [setId, sessionId, startSession]);

  useEffect(() => {
    if (isComplete) {
      resetSession();
      onClose();
    }
  }, [isComplete, resetSession, onClose]);

  if (!setId || !sessionId || currentIndex >= flashcards.length) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Offline Study</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {sessionId && currentIndex < flashcards.length ? (
            <StudyCard
              flashcard={flashcards[currentIndex]}
              isFlipped={isFlipped}
              canFlip={!isFlipped}
              onFlip={() => setIsFlipped(true)}
              onResult={handleResult}
              onConfidenceSelect={recordConfidence}
              onPrevious={() => {}}
              onEndSession={onClose}
              isConfidenceRequired={isConfidenceRequired}
              hasCompletedConfidence={hasCompletedConfidence}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}