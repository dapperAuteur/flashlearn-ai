'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  TrophyIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

type LeaderboardType = 'global' | 'classroom';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  highestScore: number;
  totalChallenges: number;
}

function getRankDisplay(rank: number): { icon: string; color: string } {
  switch (rank) {
    case 1:
      return { icon: '1st', color: 'text-amber-500 bg-amber-50' };
    case 2:
      return { icon: '2nd', color: 'text-gray-500 bg-gray-100' };
    case 3:
      return { icon: '3rd', color: 'text-amber-700 bg-amber-100' };
    default:
      return { icon: `${rank}`, color: 'text-gray-400 bg-gray-50' };
  }
}

export default function LeaderboardPage() {
  const { data: session, status: authStatus } = useSession();
  const userId = session?.user?.id || '';

  const [activeTab, setActiveTab] = useState<LeaderboardType>('global');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const limit = 20;

  const fetchLeaderboard = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          type: activeTab,
          limit: limit.toString(),
        });

        const res = await fetch(`/api/versus/leaderboard?${params}&_t=${Date.now()}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.message || 'Failed to load leaderboard');
          return;
        }

        const data = await res.json();
        const entries: LeaderboardEntry[] = data.leaderboard || [];

        if (append) {
          setLeaderboard((prev) => [...prev, ...entries]);
        } else {
          setLeaderboard(entries);
        }

        // If we got fewer results than the limit, no more pages
        setHasMore(entries.length >= limit);
      } catch {
        setError('Failed to load leaderboard. Please try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    setPage(1);
    fetchLeaderboard(1);
  }, [authStatus, activeTab, fetchLeaderboard]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLeaderboard(nextPage, true);
  };

  const handleTabChange = (tab: LeaderboardType) => {
    setActiveTab(tab);
    setLeaderboard([]);
    setPage(1);
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/versus"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Versus
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <TrophyIcon className="h-7 w-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-sm text-gray-600">See how you rank against other players.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('global')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'global'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Global
          </button>
          <button
            onClick={() => handleTabChange('classroom')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'classroom'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Classroom
          </button>
        </nav>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto" />
            <p className="mt-3 text-sm text-gray-500">Loading leaderboard...</p>
          </div>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <TrophyIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-medium text-gray-900 mb-1">No Rankings Yet</h3>
          <p className="text-sm text-gray-500">
            {activeTab === 'classroom'
              ? 'No classroom leaderboard data available. Make sure you are in a classroom with active challenges.'
              : 'Complete versus challenges to appear on the leaderboard.'}
          </p>
        </div>
      ) : (
        <>
          {/* Leaderboard Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-[60px_1fr_80px_100px_80px_80px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <span>Rank</span>
              <span>Player</span>
              <span className="text-right">Rating</span>
              <span className="text-center">W/L/D</span>
              <span className="text-right">Best</span>
              <span className="text-right hidden sm:block">Games</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100">
              {leaderboard.map((entry) => {
                const isCurrentUser = entry.userId?.toString() === userId;
                const rankDisplay = getRankDisplay(entry.rank);

                return (
                  <div
                    key={entry.userId}
                    className={`grid grid-cols-[60px_1fr_80px_100px_80px_80px] gap-2 px-4 py-3 items-center ${
                      isCurrentUser
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Rank */}
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${rankDisplay.color}`}
                    >
                      {rankDisplay.icon}
                    </span>

                    {/* Name */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {entry.userName}
                        {isCurrentUser && (
                          <span className="ml-1.5 text-xs text-blue-500 font-normal">(you)</span>
                        )}
                      </p>
                    </div>

                    {/* Rating */}
                    <span className="text-sm font-semibold text-gray-700 text-right">
                      {entry.rating}
                    </span>

                    {/* W/L/D */}
                    <span className="text-xs text-gray-600 text-center">
                      <span className="text-green-600 font-medium">{entry.wins}</span>
                      {' / '}
                      <span className="text-red-600 font-medium">{entry.losses}</span>
                      {' / '}
                      <span className="text-gray-500 font-medium">{entry.draws}</span>
                    </span>

                    {/* Best Score */}
                    <span className="text-sm text-gray-600 text-right">
                      {entry.highestScore}
                    </span>

                    {/* Total Challenges */}
                    <span className="text-sm text-gray-500 text-right hidden sm:block">
                      {entry.totalChallenges}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {isLoadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500 mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className="h-4 w-4 mr-1" />
                    Load More
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
