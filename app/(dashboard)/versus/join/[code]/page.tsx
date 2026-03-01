'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ParticipantList from '@/components/versus/ParticipantList';
import {
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface Participant {
  userId: string;
  userName: string;
  status: string;
  compositeScore?: number;
  rank?: number;
}

interface Challenge {
  _id: string;
  challengeCode: string;
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

function getTimeRemaining(expiresAt: string): string {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export default function JoinChallengePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const code = params.code as string;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [isNewJoin, setIsNewJoin] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !code) return;

    const joinChallenge = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/versus/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeCode: code }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || 'Failed to join challenge');
          return;
        }

        setChallenge(data.challenge);

        if (data.message === 'Already joined') {
          setJoinMessage('You have already joined this challenge.');
          setIsNewJoin(false);
        } else {
          setJoinMessage('Successfully joined the challenge!');
          setIsNewJoin(true);
        }
      } catch {
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    joinChallenge();
  }, [authStatus, code]);

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-600">Joining challenge...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to Join</h2>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/versus')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to Versus
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) return null;

  const userId = session?.user?.id || '';
  const myParticipation = challenge.participants.find(
    (p) => p.userId === userId
  );
  const hasCompleted = myParticipation?.status === 'completed';

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push('/versus')}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Versus
      </button>

      {/* Join status message */}
      {joinMessage && (
        <div
          className={`rounded-lg border p-4 ${
            isNewJoin
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircleIcon
              className={`h-5 w-5 ${isNewJoin ? 'text-green-600' : 'text-blue-600'}`}
            />
            <p
              className={`text-sm font-medium ${
                isNewJoin ? 'text-green-800' : 'text-blue-800'
              }`}
            >
              {joinMessage}
            </p>
          </div>
        </div>
      )}

      {/* Challenge Details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
              VS
            </span>
            <h1 className="text-xl font-bold text-gray-900">{challenge.setName}</h1>
          </div>
          <p className="text-sm text-gray-400 font-mono">{challenge.challengeCode}</p>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-500">Study Mode</p>
            <p className="text-sm font-medium text-gray-900 capitalize">
              {challenge.studyMode === 'multiple-choice' ? 'Multiple Choice' : 'Classic'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Direction</p>
            <p className="text-sm font-medium text-gray-900 capitalize">
              {challenge.studyDirection === 'front-to-back' ? 'Front to Back' : 'Back to Front'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cards</p>
            <p className="text-sm font-medium text-gray-900">{challenge.cardCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Time Remaining</p>
            <div className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-900">
                {getTimeRemaining(challenge.expiresAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Participants ({challenge.participants.length}/{challenge.maxParticipants})
          </h3>
          <ParticipantList
            participants={challenge.participants}
            currentUserId={userId}
          />
        </div>

        {/* Action Button */}
        {hasCompleted ? (
          <Link
            href={`/versus/results/${challenge._id}`}
            className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            View Results
          </Link>
        ) : (
          <Link
            href={`/versus/play/${challenge._id}`}
            className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            Play Now
          </Link>
        )}
      </div>
    </div>
  );
}
