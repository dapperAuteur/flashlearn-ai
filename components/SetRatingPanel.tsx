'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import RatingStars from '@/components/RatingStars';

interface SetRatingPanelProps {
  setId: string;
  /** Aggregate rendered on the server, so the summary is right before the fetch lands. */
  initialAverage: number;
  initialCount: number;
}

interface RatingState {
  rating: number | null;
  canRate: boolean;
  ratingAverage: number;
  ratingCount: number;
}

/**
 * Owns the "what did I rate this" read for the public set page. RatingStars
 * stays presentational plus its own write, so Explore can reuse it read-only
 * without any request at all.
 */
export default function SetRatingPanel({
  setId,
  initialAverage,
  initialCount,
}: SetRatingPanelProps) {
  const { status } = useSession();
  const [state, setState] = useState<RatingState | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/sets/${setId}/rating`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setState(data as RatingState);
      })
      .catch(() => {
        // Falls back to the server-rendered read-only summary below.
      });

    return () => {
      cancelled = true;
    };
  }, [setId, status]);

  if (!state) {
    return <RatingStars average={initialAverage} count={initialCount} size="sm" />;
  }

  if (!state.canRate) {
    return (
      <div className="flex flex-col gap-1">
        <RatingStars average={state.ratingAverage} count={state.ratingCount} size="sm" />
        {status === 'unauthenticated' && (
          <p className="text-xs text-gray-600 dark:text-gray-300">
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent(`/sets/${setId}`)}`}
              className="underline hover:text-gray-900 dark:hover:text-white"
            >
              Sign in
            </Link>{' '}
            to rate this set.
          </p>
        )}
      </div>
    );
  }

  return (
    <RatingStars
      setId={setId}
      average={state.ratingAverage}
      count={state.ratingCount}
      userRating={state.rating}
      interactive
      size="sm"
    />
  );
}
