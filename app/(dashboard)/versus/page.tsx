'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  BoltIcon,
  TrophyIcon,
  StarIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import ChallengeCard from '@/components/versus/ChallengeCard';
import JoinChallengeInput from '@/components/versus/JoinChallengeInput';

interface Participant {
  userId: string;
  userName: string;
  status: string;
  compositeScore: number;
  rank: number;
}

interface Challenge {
  _id: string;
  challengeCode: string;
  setName: string;
  studyMode: string;
  status: 'pending' | 'active' | 'completed' | 'expired';
  participants: Participant[];
  maxParticipants: number;
  expiresAt: string;
  createdAt: string;
  scope: string;
}

interface VersusStats {
  totalChallenges: number;
  wins: number;
  losses: number;
  draws: number;
  currentWinStreak: number;
  bestWinStreak: number;
  highestCompositeScore: number;
  averageCompositeScore: number;
  rating: number;
}

export default function VersusHubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = session?.user?.id || '';

  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<Challenge[]>([]);
  const [openChallenges, setOpenChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<VersusStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoin = async (code: string) => {
    setJoinLoading(true);
    setJoinError(null);
    try {
      const res = await fetch('/api/versus/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.message || 'Failed to join challenge');
        return;
      }
      router.push(`/versus/join/${code}`);
    } catch {
      setJoinError('An unexpected error occurred. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const cacheBust = `_t=${Date.now()}`;
        const [activeRes, completedRes, statsRes, openRes] = await Promise.all([
          fetch(`/api/versus/challenges?status=active&${cacheBust}`),
          fetch(`/api/versus/challenges?status=completed&limit=5&${cacheBust}`),
          fetch(`/api/versus/stats?${cacheBust}`),
          fetch(`/api/versus/open?limit=5&${cacheBust}`),
        ]);

        if (activeRes.ok) {
          const data = await activeRes.json();
          setActiveChallenges(data.challenges || []);
        }
        if (completedRes.ok) {
          const data = await completedRes.json();
          setCompletedChallenges(data.challenges || []);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats || null);
        }
        if (openRes.ok) {
          const data = await openRes.json();
          setOpenChallenges(data.challenges || []);
        }
      } catch {
        setError('Failed to load versus data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [status]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-600">Loading Versus Mode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <BoltIcon className="h-7 w-7 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900">Versus Mode</h1>
        </div>
        <p className="text-sm text-gray-600">
          Challenge friends, classmates, or the community and compare your scores.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/versus/create"
          className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
          Create Challenge
        </Link>
        <Link
          href="/versus/how-it-works"
          className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <QuestionMarkCircleIcon className="-ml-1 mr-2 h-4 w-4" />
          How It Works
        </Link>
      </div>

      {/* Join Challenge */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Join a Challenge</h2>
        <JoinChallengeInput onJoin={handleJoin} isLoading={joinLoading} error={joinError} />
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <TrophyIcon className="h-6 w-6 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">
              {stats.wins}W / {stats.losses}L / {stats.draws}D
            </p>
            <p className="text-xs text-gray-500">Record</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <StarIcon className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{stats.rating}</p>
            <p className="text-xs text-gray-500">Rating</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <BoltIcon className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{stats.highestCompositeScore}</p>
            <p className="text-xs text-gray-500">Best Score</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Active Challenges */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Active Challenges</h2>
          {activeChallenges.length > 0 && (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {activeChallenges.length} active
            </span>
          )}
        </div>
        {activeChallenges.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <BoltIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No active challenges.</p>
            <p className="text-xs text-gray-400 mt-1">
              Create a new challenge or join one with a code.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge._id}
                challenge={challenge}
                currentUserId={userId}
              />
            ))}
          </div>
        )}
      </section>

      {/* Open Public Challenges */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900">Open Public Challenges</h2>
          </div>
        </div>
        {openChallenges.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <GlobeAltIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No public challenges available right now.</p>
            <p className="text-xs text-gray-400 mt-1">
              Be the first to create a public challenge!
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {openChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge._id}
                challenge={challenge}
                currentUserId={userId}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Results */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Recent Results</h2>
          {completedChallenges.length > 0 && (
            <Link
              href="/versus/leaderboard"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Leaderboard
            </Link>
          )}
        </div>
        {completedChallenges.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <TrophyIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No completed challenges yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Complete a challenge to see your results here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {completedChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge._id}
                challenge={challenge}
                currentUserId={userId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
