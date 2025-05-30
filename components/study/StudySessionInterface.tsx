// components/study/StudySessionInterface.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logger, LogContext } from '@/lib/logging/client-logger';

interface Flashcard {
  id: string;
  _id?: string;
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
  stage?: number;
  nextReviewDate?: string;
}

interface StudySessionInterfaceProps {
  sessionId: string;
}

export default function StudySessionInterface({ sessionId }: StudySessionInterfaceProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [results, setResults] = useState({ correct: 0, total: 0 });
  const [showQualityButtons, setShowQualityButtons] = useState(false);
  
  // Time tracking
  const [sessionStartTime] = useState(Date.now());
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [totalSessionTime, setTotalSessionTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReviewMode = searchParams.get('mode') === 'review';


  useEffect(() => {
    fetchSessionData();
    startSessionTimer();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sessionId]);

  const startSessionTimer = () => {
    intervalRef.current = setInterval(() => {
      setTotalSessionTime(Date.now() - sessionStartTime);
    }, 1000);
  };

  const resetCardTimer = () => {
    setCardStartTime(Date.now());
  };

  const getCardTime = () => {
    return Math.round((Date.now() - cardStartTime) / 1000);
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`/api/study/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to load session');
      
      const data = await response.json();
      Logger.log(LogContext.STUDY, "Session loaded", {
        sessionId,
        isReviewMode,
        flashcardCount: data.flashcards.length
      });
      setFlashcards(data.flashcards);
      setIsLoading(false);
      resetCardTimer();
    } catch (error) {
      Logger.error(LogContext.STUDY, `Failed to load session. error: ${error}`,
        {
          sessionId,
          isReviewMode,
          flashcardCount: flashcards.length
        }
      );
      setError(`Failed to load study session data. error: ${error}`);
      setIsLoading(false);
    }
  };

  const handleAnswer = async (quality: number) => {
    const currentCard = flashcards[currentCardIndex];
    const timeSpent = getCardTime();
    const flashcardId = currentCard._id || currentCard.id;

    try {
      Logger.log(LogContext.STUDY, "Card answered", {
        flashcardId,
        quality,
        sessionId,
        isReviewMode
      })
      if (isReviewMode) {
        // Use spaced repetition endpoint
        await fetch(`/api/flashcards/${flashcardId}/review`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quality: quality.toString(),
            timeSpent: timeSpent * 1000
          })
        });
      } else {
        // Use regular study endpoint
      await fetch(`/api/study/sessions/${sessionId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: currentCard.id,
          isCorrect: quality >= 2,
          timeSeconds: timeSpent
        })
      });
    }

      setResults(prev => ({
        correct: prev.correct + (quality >= 2 ? 1 : 0),
        total: prev.total + 1
      }));

      Logger.log(LogContext.STUDY, "Card answered", {
        cardId: flashcardId,
        quality,
        timeSeconds: timeSpent,
        sessionId,
        isReviewMode
      });

      nextCard();
    } catch (error) {
      Logger.error(LogContext.STUDY, `Failed to record answer. error: ${error}`);
    }
  };

  const nextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
      setShowQualityButtons(false);
      resetCardTimer();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setSessionComplete(true);
    }
  };

  const finishSession = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center">{error}</div>;
  }

  if (sessionComplete) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-gray-700 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Session Complete!</h2>
        <p className="text-lg mb-2">
          Score: {results.correct}/{results.total} ({Math.round((results.correct/results.total) * 100)}%)
        </p>
        <p className="text-sm text-gray-400 mb-4">
          Total time: {formatTime(totalSessionTime)}
        </p>
        <button
          onClick={finishSession}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentCard = flashcards[currentCardIndex];
  const isNewCard = currentCard.stage === 0;

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6">
      <div className="flex justify-between mb-4 text-sm text-gray-60">
        <span>
          Card {currentCardIndex + 1} of {flashcards.length}
          {isReviewMode && isNewCard && (
            <span className="ml-2 text-blue-400">(New)</span>
          )}
        </span>
        <span>Session time: {formatTime(totalSessionTime)}</span>
      </div>
      
      <div className="bg-gray-700 rounded-lg shadow-lg p-8 min-h-[300px] flex flex-col justify-center">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold mb-4">
            {showAnswer ? 'Answer:' : 'Question:'}
          </h3>
          <p className="text-lg">
            {showAnswer ? currentCard.back : currentCard.front}
          </p>
        </div>

        {!showAnswer ? (
          <button
            onClick={() => {
              setShowAnswer(true);
              setShowQualityButtons(isReviewMode);
            }}
            className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-900"
          >
            Show Answer
          </button>
          ) : (
          <div className="space-y-4">
            {showQualityButtons ? (
              <>
                <div className="text-center text-sm text-gray-400 mb-2">
                  How well did you know this?
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAnswer(0)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Again
                  </button>
                  <button
                    onClick={() => handleAnswer(1)}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Hard
                  </button>
                  <button
                    onClick={() => handleAnswer(2)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Good
                  </button>
                  <button
                    onClick={() => handleAnswer(3)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Easy
                  </button>
                </div>
              </>
        ) : (
          <div className="flex space-x-4">
            <button
              onClick={() => handleAnswer(0)}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Incorrect
            </button>
            <button
              onClick={() => handleAnswer(2)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Correct
            </button>
          </div>
        )}
      </div>
      )}
    </div>
    </div>
  );
}