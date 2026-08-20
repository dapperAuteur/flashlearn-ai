'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpenIcon, PlayIcon, TrashIcon } from '@heroicons/react/24/outline';

interface LibrarySet {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  isOwned: boolean;
  addedAt: string;
  lastStudiedAt: string | null;
  pinned: boolean;
}

/**
 * The signed-in learner's own shelf, and the first thing on the dashboard.
 *
 * The server already returns the sets in the order they should appear: pinned
 * first, then most recently studied, then most recently added. This does not
 * re-sort them.
 */
export default function LibraryPanel() {
  const [sets, setSets] = useState<LibrarySet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/library')
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setSets(data.sets || []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your library. Reload to try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const remove = useCallback(async (setId: string) => {
    const previous = sets;
    setRemovingId(setId);
    setSets((current) => current.filter((s) => s.id !== setId));
    try {
      const res = await fetch(`/api/library?setId=${encodeURIComponent(setId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setSets(previous);
      setError('Could not remove that set. Check your connection and try again.');
    } finally {
      setRemovingId(null);
    }
  }, [sets]);

  const lastStudiedLabel = (value: string | null) => {
    if (!value) return 'Not studied yet';
    const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
    if (days < 1) return 'Studied today';
    if (days === 1) return 'Studied yesterday';
    if (days < 30) return `Studied ${days} days ago`;
    return `Studied ${new Date(value).toLocaleDateString()}`;
  };

  return (
    <section aria-labelledby="library-heading" className="bg-white shadow rounded-xl overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <h2 id="library-heading" className="text-base sm:text-lg font-medium text-gray-900">
          Your Library
        </h2>
        <Link
          href="/explore"
          className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Add more sets
        </Link>
      </div>

      {error && (
        <p role="alert" className="px-4 sm:px-6 py-3 text-sm text-red-700 bg-red-50">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading your library...</p>
        </div>
      ) : sets.length === 0 ? (
        <div className="p-6 sm:p-8 text-center">
          <BookOpenIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Your library is empty
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Pick a few sets you plan to study. They will show up here every time you sign in, so
            you are not searching the whole catalogue to find the one you want.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Browse sets to add
            </Link>
            <Link
              href="/generate"
              className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Make your own
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {sets.map((set) => (
            <li key={set.id} className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/sets/${set.id}`}
                  className="text-sm font-medium text-gray-900 hover:text-blue-700 truncate block"
                >
                  {set.title}
                </Link>
                <p className="text-xs text-gray-600">
                  {set.cardCount} cards
                  <span aria-hidden="true"> · </span>
                  {lastStudiedLabel(set.lastStudiedAt)}
                  {set.pinned && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="font-medium">Pinned</span>
                    </>
                  )}
                  {set.isOwned && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span>Yours</span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/study?setId=${set.id}`}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <PlayIcon className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Study
                </Link>
                <button
                  type="button"
                  onClick={() => remove(set.id)}
                  disabled={removingId === set.id}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  <TrashIcon className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  <span className="sr-only">Remove {set.title} from your library</span>
                  <span aria-hidden="true">Remove</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && sets.length > 0 && (
        <p className="px-4 sm:px-6 py-3 text-xs text-gray-600 border-t border-gray-100">
          Removing a set keeps your progress on it. Add it back later and your streak picks up
          where it left off.
        </p>
      )}
    </section>
  );
}
