'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const PAGE_SIZE = 20;

type SortOption = 'date_desc' | 'date_asc' | 'accuracy_desc' | 'accuracy_asc';

interface HistorySession {
  sessionId: string;
  setId: string;
  setName: string;
  startTime: string;
  endTime?: string;
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  studyDirection: string;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined });
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortOption>('date_desc');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async (currentPage: number, currentSort: SortOption) => {
    setIsLoading(true);
    try {
      const offset = currentPage * PAGE_SIZE;
      const res = await fetch(
        `/api/study/history?limit=${PAGE_SIZE}&offset=${offset}&sort=${currentSort}&_t=${Date.now()}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(page, sort);
  }, [page, sort, fetchSessions]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study History</h1>
          <p className="mt-1 text-gray-600">Browse all your past study sessions.</p>
        </div>
        <Link
          href="/analytics"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Analytics →
        </Link>
      </div>

      {/* Sort bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 flex-shrink-0">Sort by</label>
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value as SortOption)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="date_desc">Date: Newest first</option>
          <option value="date_asc">Date: Oldest first</option>
          <option value="accuracy_desc">Accuracy: Highest first</option>
          <option value="accuracy_asc">Accuracy: Lowest first</option>
        </select>
        {total > 0 && (
          <span className="ml-auto text-xs text-gray-500">{total} session{total !== 1 ? 's' : ''} total</span>
        )}
      </div>

      {/* Session list */}
      <div className="bg-white shadow rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">No study sessions yet. Start studying to see your history here.</p>
            <Link
              href="/explore"
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Browse Sets
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sessions.map((s) => (
              <li key={s.sessionId}>
                <Link
                  href={`/results/${s.sessionId}`}
                  className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Accuracy indicator */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                      s.accuracy >= 80
                        ? 'bg-green-100 text-green-700'
                        : s.accuracy >= 50
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {s.accuracy}%
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.setName}</p>
                    <p className="text-xs text-gray-500">
                      {s.correctCount}/{s.totalCards} correct
                    </p>
                  </div>

                  {/* Time */}
                  <span className="flex-shrink-0 text-xs text-gray-500">
                    {formatDate(s.startTime)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
