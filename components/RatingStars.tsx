'use client';

import { useId, useState } from 'react';

export interface RatingAggregateResult {
  rating: number | null;
  ratingAverage: number;
  ratingCount: number;
}

interface RatingStarsProps {
  /** Required when `interactive` is true. Ignored for the read-only display. */
  setId?: string;
  /** Current average across all raters. */
  average: number;
  /** How many people have rated. */
  count: number;
  /** The signed-in user's own rating, if they have one. */
  userRating?: number | null;
  /** Show the radio controls. False renders a read-only summary. */
  interactive?: boolean;
  size?: 'sm' | 'md';
  /** Fires with the server's fresh aggregate after a rate or clear. */
  onChange?: (result: RatingAggregateResult) => void;
}

const STARS = [1, 2, 3, 4, 5];

function summaryText(average: number, count: number): string {
  if (count === 0) return 'No ratings yet';
  return `${average.toFixed(1)} average from ${count} ${count === 1 ? 'rating' : 'ratings'}`;
}

/**
 * A star rating is a form control, so the interactive version is a real
 * fieldset of radio inputs. Arrow keys move between stars, Space picks one, and
 * every star carries its own text label. The average is always written out as
 * text next to the stars, never left to the icons alone.
 */
export default function RatingStars({
  setId,
  average,
  count,
  userRating = null,
  interactive = false,
  size = 'md',
  onChange,
}: RatingStarsProps) {
  const groupId = useId();
  const [selected, setSelected] = useState<number | null>(userRating);
  const [hovered, setHovered] = useState<number>(0);
  const [aggregate, setAggregate] = useState({ average, count });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const starSize = size === 'sm' ? 'text-base' : 'text-2xl';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const send = async (method: 'POST' | 'DELETE', rating?: number) => {
    if (!setId) return;
    const previous = selected;
    // Arrow keys move between radios and check as they go. Reflecting the pick
    // immediately keeps the controlled inputs in step with the keyboard instead
    // of snapping back until the request lands.
    setSelected(rating ?? null);
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/sets/${setId}/rating`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(rating === undefined ? {} : { body: JSON.stringify({ rating }) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not save your rating');
      }

      setSelected(data.rating ?? null);
      setAggregate({ average: data.ratingAverage, count: data.ratingCount });
      onChange?.(data as RatingAggregateResult);
    } catch (err) {
      setSelected(previous);
      setError(err instanceof Error ? err.message : 'Could not save your rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = summaryText(aggregate.average, aggregate.count);

  if (!interactive) {
    // Read straight from props rather than the local copy. Explore reuses these
    // cards by set id across a re-sort, so held state would show the previous
    // fetch's numbers on a card that moved.
    const filled = Math.round(average);
    return (
      <p className={`flex items-center gap-1.5 ${textSize} text-gray-600 dark:text-gray-300`}>
        <span aria-hidden="true" className={`${starSize} leading-none`}>
          {STARS.map((star) => (
            <span
              key={star}
              className={star <= filled ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}
            >
              ★
            </span>
          ))}
        </span>
        <span>{summaryText(average, count)}</span>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <fieldset disabled={isSubmitting} className="border-0 p-0 m-0">
        <legend className={`${textSize} font-medium text-gray-700 dark:text-gray-200 mb-1`}>
          Rate this set
        </legend>
        <div className="flex items-center gap-1">
          {STARS.map((star) => {
            const inputId = `${groupId}-star-${star}`;
            const isLit = (hovered || selected || 0) >= star;
            return (
              <span key={star} className="relative inline-flex">
                <input
                  type="radio"
                  id={inputId}
                  name={`${groupId}-rating`}
                  value={star}
                  checked={selected === star}
                  onChange={() => send('POST', star)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={inputId}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className={`cursor-pointer rounded px-0.5 leading-none transition-colors ${starSize} ${
                    isLit ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'
                  } hover:text-yellow-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 peer-disabled:cursor-not-allowed`}
                >
                  <span aria-hidden="true">★</span>
                  <span className="sr-only">Rate {star} out of 5</span>
                </label>
              </span>
            );
          })}
          {selected !== null && (
            <button
              type="button"
              onClick={() => send('DELETE')}
              className={`ml-2 ${textSize} text-gray-600 dark:text-gray-300 underline hover:text-gray-900 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded disabled:opacity-50`}
            >
              Clear my rating
            </button>
          )}
        </div>
      </fieldset>

      <p aria-live="polite" className={`${textSize} text-gray-600 dark:text-gray-300`}>
        {isSubmitting
          ? 'Saving your rating...'
          : selected !== null
            ? `You rated this ${selected} out of 5. ${summary}.`
            : summary}
      </p>

      {error && (
        <p role="alert" className={`${textSize} text-red-600 dark:text-red-400`}>
          {error}
        </p>
      )}
    </div>
  );
}
