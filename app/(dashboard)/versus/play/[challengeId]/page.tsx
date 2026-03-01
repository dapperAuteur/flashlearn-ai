'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ChallengeHeader from '@/components/versus/ChallengeHeader';
import {
  CheckIcon,
  XMarkIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface Flashcard {
  _id: string;
  front: string;
  back: string;
}

interface CardAnswer {
  cardId: string;
  isCorrect: boolean;
  timeSeconds: number;
  confidenceRating: number;
}

interface ChallengeDetails {
  _id: string;
  challengeCode: string;
  setName: string;
  studyMode: string;
  studyDirection: string;
  cardCount: number;
  status: string;
  flashcardSetId: string;
  participants: Array<{
    userId: string;
    userName: string;
    status: string;
  }>;
  maxParticipants: number;
}

export default function PlayChallengePage() {
  const params = useParams();
  const router = useRouter();
  const { status: authStatus } = useSession();
  const challengeId = params.challengeId as string;

  // Challenge state
  const [challenge, setChallenge] = useState<ChallengeDetails | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [studyDirection, setStudyDirection] = useState<string>('front-to-back');

  // Play state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [answers, setAnswers] = useState<CardAnswer[]>([]);
  const [showConfidence, setShowConfidence] = useState(false);
  const [pendingCorrect, setPendingCorrect] = useState<boolean | null>(null);
  const cardStartTime = useRef<number>(Date.now());

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch challenge details and start the play session
  useEffect(() => {
    if (authStatus !== 'authenticated' || !challengeId) return;

    const initChallenge = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch challenge details first
        const detailsRes = await fetch(`/api/versus/challenges/${challengeId}`);
        if (!detailsRes.ok) {
          const data = await detailsRes.json();
          setError(data.message || 'Failed to load challenge');
          return;
        }
        const detailsData = await detailsRes.json();
        setChallenge(detailsData.challenge);

        // Check if the user already completed this challenge
        const myParticipation = detailsData.myParticipation;
        if (myParticipation?.status === 'completed') {
          router.replace(`/versus/results/${challengeId}`);
          return;
        }

        // Start play session
        const playRes = await fetch(`/api/versus/challenges/${challengeId}/play`, {
          method: 'POST',
        });

        if (!playRes.ok) {
          const playData = await playRes.json();
          // If already started, the session exists but we need to handle it
          if (playData.message === 'You have already started this challenge') {
            setError('You have already started this challenge. If you left mid-session, your progress may be lost.');
            return;
          }
          setError(playData.message || 'Failed to start challenge');
          return;
        }

        const playData = await playRes.json();
        setSessionId(playData.sessionId);
        setFlashcards(playData.flashcards);
        setStudyDirection(playData.studyDirection || 'front-to-back');
        cardStartTime.current = Date.now();
      } catch {
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initChallenge();
  }, [authStatus, challengeId, router]);

  const currentCard = flashcards[currentIndex] || null;
  const totalCards = flashcards.length;
  const progress = totalCards > 0 ? ((currentIndex) / totalCards) * 100 : 0;

  const getFrontContent = useCallback(
    (card: Flashcard) =>
      studyDirection === 'back-to-front' ? card.back : card.front,
    [studyDirection]
  );

  const getBackContent = useCallback(
    (card: Flashcard) =>
      studyDirection === 'back-to-front' ? card.front : card.back,
    [studyDirection]
  );

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  };

  const handleGrade = (isCorrect: boolean) => {
    setPendingCorrect(isCorrect);
    setShowConfidence(true);
  };

  const handleConfidence = (rating: number) => {
    if (pendingCorrect === null || !currentCard) return;

    const timeSeconds = Math.round((Date.now() - cardStartTime.current) / 1000);

    const answer: CardAnswer = {
      cardId: currentCard._id,
      isCorrect: pendingCorrect,
      timeSeconds: Math.max(timeSeconds, 1),
      confidenceRating: rating,
    };

    setAnswers((prev) => [...prev, answer]);
    setShowConfidence(false);
    setPendingCorrect(null);
    setIsFlipped(false);

    if (currentIndex + 1 < totalCards) {
      setCurrentIndex(currentIndex + 1);
      cardStartTime.current = Date.now();
    } else {
      // All cards done - submit results
      handleComplete([...answers, answer]);
    }
  };

  const handleComplete = async (finalAnswers: CardAnswer[]) => {
    if (!sessionId || !challenge) return;
    setIsSubmitting(true);
    setIsCompleted(true);

    try {
      // Batch send all card results via the sync endpoint
      const correctCount = finalAnswers.filter((a) => a.isCorrect).length;
      const incorrectCount = finalAnswers.length - correctCount;
      const totalDuration = finalAnswers.reduce((sum, a) => sum + a.timeSeconds, 0);

      await fetch('/api/study/sessions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          setId: challenge.flashcardSetId,
          setName: challenge.setName,
          totalCards: finalAnswers.length,
          correctCount,
          incorrectCount,
          durationSeconds: totalDuration,
          startTime: new Date(Date.now() - totalDuration * 1000).toISOString(),
          endTime: new Date().toISOString(),
          studyDirection,
          results: finalAnswers.map((a) => ({
            cardId: a.cardId,
            isCorrect: a.isCorrect,
            timeSeconds: a.timeSeconds,
            confidenceRating: a.confidenceRating,
          })),
        }),
      });

      // Complete the challenge
      await fetch(`/api/versus/challenges/${challengeId}/complete`, {
        method: 'POST',
      });

      // Redirect to results
      router.push(`/versus/results/${challengeId}`);
    } catch {
      setError('Failed to submit results. Please try again.');
      setIsSubmitting(false);
      setIsCompleted(false);
    }
  };

  // Loading state
  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-600">Loading challenge...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Challenge Error</h2>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/versus')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Versus
          </button>
        </div>
      </div>
    );
  }

  // Submitting state
  if (isSubmitting || isCompleted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto" />
          <p className="mt-3 text-gray-600">Submitting your results...</p>
        </div>
      </div>
    );
  }

  if (!currentCard || !challenge) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Challenge Header */}
      <ChallengeHeader
        challengeCode={challenge.challengeCode}
        setName={challenge.setName}
        participantCount={challenge.participants.length}
        studyMode={challenge.studyMode}
      />

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">
            Card {currentIndex + 1} of {totalCards}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Score so far */}
      {answers.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600 font-medium">
            {answers.filter((a) => a.isCorrect).length} correct
          </span>
          <span className="text-red-600 font-medium">
            {answers.filter((a) => !a.isCorrect).length} missed
          </span>
        </div>
      )}

      {/* Flashcard */}
      <div
        className="relative cursor-pointer perspective-1000"
        onClick={!isFlipped ? handleFlip : undefined}
      >
        <div
          className={`bg-white rounded-2xl border-2 shadow-lg p-8 min-h-[280px] flex flex-col items-center justify-center text-center transition-all duration-500 ${
            isFlipped
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-xl'
          }`}
        >
          {/* Label */}
          <p className="absolute top-4 left-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
            {isFlipped
              ? studyDirection === 'back-to-front'
                ? 'Front'
                : 'Back'
              : studyDirection === 'back-to-front'
                ? 'Back'
                : 'Front'}
          </p>

          {/* Content */}
          <p className="text-xl sm:text-2xl font-medium text-gray-900 leading-relaxed">
            {isFlipped ? getBackContent(currentCard) : getFrontContent(currentCard)}
          </p>

          {/* Tap to flip hint */}
          {!isFlipped && (
            <p className="absolute bottom-4 text-xs text-gray-400">Tap to reveal answer</p>
          )}
        </div>
      </div>

      {/* Grading Buttons (after flip) */}
      {isFlipped && !showConfidence && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleGrade(false)}
            className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-red-700 bg-red-50 border-2 border-red-200 hover:bg-red-100 transition-colors"
          >
            <XMarkIcon className="h-5 w-5 mr-2" />
            Missed It
          </button>
          <button
            onClick={() => handleGrade(true)}
            className="inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-green-700 bg-green-50 border-2 border-green-200 hover:bg-green-100 transition-colors"
          >
            <CheckIcon className="h-5 w-5 mr-2" />
            Got It
          </button>
        </div>
      )}

      {/* Confidence Rating */}
      {showConfidence && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-700 mb-3 text-center">
            How confident were you?
          </p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleConfidence(rating)}
                className={`w-12 h-12 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  rating <= 2
                    ? 'border-red-200 text-red-700 hover:bg-red-50'
                    : rating === 3
                      ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50'
                      : 'border-green-200 text-green-700 hover:bg-green-50'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
            <span>Guessing</span>
            <span>Very Sure</span>
          </div>
        </div>
      )}

      {/* Skip confidence shortcut */}
      {showConfidence && (
        <button
          onClick={() => handleConfidence(3)}
          className="w-full inline-flex items-center justify-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip (default 3)
          <ArrowRightIcon className="h-3 w-3 ml-1" />
        </button>
      )}
    </div>
  );
}
