'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeftIcon, TrophyIcon } from '@heroicons/react/24/outline';
import ChallengeCard from '@/components/versus/ChallengeCard';

type StatusFilter = 'all' | 'active' | 'completed' | 'expired';
type ScopeFilter = 'all' | 'public' | 'direct' | 'classroom';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'expired', label: 'Expired' },
];

const SCOPE_FILTERS: { key: ScopeFilter; label: string }[] = [
  { key: 'all', label: 'All Scopes' },
  { key: 'public', label: 'Public' },
  { key: 'direct', label: 'Direct' },
  { key: 'classroom', label: 'Classroom' },
];

const PAGE_SIZE = 20;

interface Challenge {
  _id: string;
  challengeCode: string;
  setName: string;
  studyMode: string;
  status: 'pending' | 'active' | 'completed' | 'expired';
  participants: {
    userId: string;
    userName: string;
    status: string;
    compositeScore: number;
    rank: number;
  }[];
  maxParticipants: number;
  expiresAt: string;
  createdAt: string;
  scope: string;
}

export default function ChallengeHistoryPage() {
  const { data: session, status: authStatus } = useSession();
  const userId = session?.user?.id ?? '';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChallenges = useCallback(
    async (pageNum: number, append = false) => {
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (scopeFilter !== 'all') params.set('scope', scopeFilter);

        const res = await fetch(`/api/versus/challenges?${params.toString()}&_t=${Date.now()}`);
        if (!res.ok) throw new Error('Failed to load challenge history');
        const data = await res.json();

        setChallenges((prev) => (append ? [...prev, ...(data.challenges || [])] : (data.challenges || [])));
        setTotal(data.total ?? 0);
        setPage(pageNum);
      } catch {
        setError('Failed to load challenges. Please try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [statusFilter, scopeFilter],
  );

  // Reset and fetch on filter change
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    fetchChallenges(1, false);
  }, [authStatus, statusFilter, scopeFilter, fetchChallenges]);

  const hasMore = challenges.length < total;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/versus"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" aria-hidden="true" />
          Back to Versus
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Challenge History</h1>
        {total > 0 && !isLoading && (
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-medium text-gray-700">{total}</span> challenge{total !== 1 ? 's' : ''}
            {statusFilter !== 'all' && ` · ${STATUS_TABS.find((t) => t.key === statusFilter)?.label}`}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Status tabs */}
        <div
          className="flex gap-1 bg-gray-100 rounded-full p-1 overflow-x-auto"
          role="tablist"
          aria-label="Filter by status"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={statusFilter === tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`shrink-0 flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scope filter */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5"
          role="group"
          aria-label="Filter by scope"
        >
          {SCOPE_FILTERS.map((opt) => (
            <button
              key={opt.key}
              aria-pressed={scopeFilter === opt.key}
              onClick={() => setScopeFilter(opt.key)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                scopeFilter === opt.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div
          className="flex flex-col items-center justify-center py-20 gap-3"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"
            role="status"
            aria-label="Loading challenges"
          />
          <p className="text-sm text-gray-500">Loading challenges…</p>
        </div>
      ) : error ? (
        <div
          className="text-center py-12"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchChallenges(1, false)}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-20" aria-live="polite">
          <TrophyIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-600 font-medium mb-1">No challenges found</p>
          <p className="text-sm text-gray-400 mb-6">
            {statusFilter !== 'all' || scopeFilter !== 'all'
              ? 'Try clearing the filters.'
              : "You haven't hosted or joined any challenges yet."}
          </p>
          <Link
            href="/versus/create"
            className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Create a Challenge
          </Link>
        </div>
      ) : (
        <>
          <ol
            className="grid gap-3 sm:grid-cols-2"
            aria-label="Your challenge history"
            aria-live="polite"
          >
            {challenges.map((challenge) => (
              <li key={challenge._id}>
                <ChallengeCard challenge={challenge} currentUserId={userId} />
              </li>
            ))}
          </ol>

          {/* Load More */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => fetchChallenges(page + 1, true)}
                disabled={isLoadingMore}
                aria-busy={isLoadingMore}
                className="px-6 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"
                      aria-hidden="true"
                    />
                    Loading…
                  </span>
                ) : (
                  `Load More (${total - challenges.length} remaining)`
                )}
              </button>
            </div>
          )}

          {!hasMore && challenges.length > PAGE_SIZE && (
            <p className="mt-6 text-center text-xs text-gray-400" aria-live="polite">
              All {total} challenge{total !== 1 ? 's' : ''} loaded
            </p>
          )}
        </>
      )}
    </div>
  );
}
