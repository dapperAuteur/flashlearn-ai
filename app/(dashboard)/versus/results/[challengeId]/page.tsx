'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ScoreComparison from '@/components/versus/ScoreComparison';
import CompositeScoreBreakdown from '@/components/versus/CompositeScoreBreakdown';
import WaitingForOpponent from '@/components/versus/WaitingForOpponent';
import ChallengeShareModal from '@/components/versus/ChallengeShareModal';
import {
  TrophyIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  ShareIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Participant {
  userId: string;
  userName: string;
  status: string;
  compositeScore: number;
  rank: number;
  completedAt?: string;
  sessionId?: string;
}

interface Challenge {
  _id: string;
  challengeCode: string;
  flashcardSetId: string;
  setName: string;
  studyMode: string;
  studyDirection: string;
  cardCount: number;
  scope: string;
  status: string;
  expiresAt: string;
  participants: Participant[];
  maxParticipants: number;
}

interface CompositeScore {
  totalScore: number;
  accuracyScore: number;
  speedScore: number;
  confidenceScore: number;
  streakScore: number;
  accuracy: number;
  averageTimeSeconds: number;
  longestStreak: number;
  confidenceCalibration: number;
}

interface MyParticipation {
  userId: string;
  status: string;
  compositeScore?: number;
  rank?: number;
  sessionId?: string;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const challengeId = params.challengeId as string;
  const userId = session?.user?.id || '';

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [, setMyParticipation] = useState<MyParticipation | null>(null);
  const [compositeScore, setCompositeScore] = useState<CompositeScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchResults = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/versus/challenges/${challengeId}?_t=${Date.now()}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to load results');
        return;
      }

      const data = await res.json();
      setChallenge(data.challenge);
      setMyParticipation(data.myParticipation);

      // If the challenge complete endpoint returned composite score data,
      // construct the score breakdown from participant data
      const myPart = data.challenge?.participants?.find(
        (p: Participant) => p.userId.toString() === userId
      );
      if (myPart?.compositeScore !== undefined) {
        // We only have the total score from the challenge data
        // The detailed breakdown would come from the complete endpoint
        // For now, we show what we have
        setCompositeScore(null);
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus !== 'authenticated' || !challengeId) return;
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, challengeId, userId]);

  // Auto-refresh when waiting for opponents
  useEffect(() => {
    if (!challenge || challenge.status === 'completed') return;

    const myPart = challenge.participants.find(
      (p) => p.userId.toString() === userId
    );
    if (myPart?.status !== 'completed') return;

    // Poll every 10 seconds while waiting
    const interval = setInterval(fetchResults, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge, userId]);

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error</h2>
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

  if (!challenge) return null;

  const myPart = challenge.participants.find(
    (p) => p.userId.toString() === userId
  );
  const iHaveCompleted = myPart?.status === 'completed';
  const challengeFullyDone = challenge.status === 'completed';

  // If user has completed but challenge is not fully done yet, show waiting screen
  if (iHaveCompleted && !challengeFullyDone) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button
          onClick={() => router.push('/versus')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Versus
        </button>

        <WaitingForOpponent
          participants={challenge.participants}
          currentUserId={userId}
          onRefresh={fetchResults}
        />

        {/* Share button */}
        <button
          onClick={() => setShowShareModal(true)}
          className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <ShareIcon className="h-4 w-4 mr-2" />
          Share Challenge Link
        </button>

        <ChallengeShareModal
          isOpen={showShareModal}
          challengeCode={challenge.challengeCode}
          challengeUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/versus/join/${challenge.challengeCode}`}
          onClose={() => setShowShareModal(false)}
        />
      </div>
    );
  }

  // If user hasn't completed yet, redirect to play
  if (!iHaveCompleted) {
    router.replace(`/versus/play/${challengeId}`);
    return null;
  }

  // Full results view
  const winner = challenge.participants
    .filter((p) => p.status === 'completed')
    .sort((a, b) => (a.rank || 99) - (b.rank || 99))[0];

  const isWinner = winner?.userId.toString() === userId;
  const isDraw =
    challenge.participants.filter((p) => p.status === 'completed').length > 1 &&
    challenge.participants
      .filter((p) => p.status === 'completed')
      .every((p) => p.compositeScore === winner?.compositeScore);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push('/versus')}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Versus
      </button>

      {/* Winner Announcement */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        {isDraw ? (
          <>
            <div className="inline-flex items-center justify-center bg-yellow-100 rounded-full p-4 mb-4">
              <TrophyIcon className="h-10 w-10 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">It&apos;s a Draw!</h1>
            <p className="text-sm text-gray-500">
              All participants scored {winner?.compositeScore} points
            </p>
          </>
        ) : isWinner ? (
          <>
            <div className="inline-flex items-center justify-center bg-amber-100 rounded-full p-4 mb-4">
              <TrophyIcon className="h-10 w-10 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">You Won!</h1>
            <p className="text-sm text-gray-500">
              Congratulations! You scored {myPart?.compositeScore} points
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center bg-gray-100 rounded-full p-4 mb-4">
              <TrophyIcon className="h-10 w-10 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {myPart?.rank === 2 ? 'Runner Up!' : `Rank #${myPart?.rank}`}
            </h1>
            <p className="text-sm text-gray-500">
              You scored {myPart?.compositeScore} points. {winner?.userName} won with {winner?.compositeScore} points.
            </p>
          </>
        )}

        <div className="mt-2">
          <span className="text-xs text-gray-400 font-mono">{challenge.challengeCode}</span>
          <span className="mx-2 text-gray-300">|</span>
          <span className="text-xs text-gray-400">{challenge.setName}</span>
        </div>
      </div>

      {/* Score Comparison */}
      <ScoreComparison
        participants={challenge.participants}
        currentUserId={userId}
      />

      {/* Composite Score Breakdown (if available) */}
      {compositeScore && (
        <CompositeScoreBreakdown score={compositeScore} />
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href={`/versus/create?setId=${challenge.flashcardSetId}`}
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Rematch
        </Link>
        <button
          onClick={() => setShowShareModal(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <ShareIcon className="h-4 w-4 mr-2" />
          Share Results
        </button>
        <Link
          href="/versus"
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Versus
        </Link>
      </div>

      {/* Share Modal */}
      <ChallengeShareModal
        isOpen={showShareModal}
        challengeCode={challenge.challengeCode}
        challengeUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/versus/join/${challenge.challengeCode}`}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}
