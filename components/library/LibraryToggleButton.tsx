'use client';

import { useState, useTransition } from 'react';
import { BookmarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface LibraryToggleButtonProps {
  setId: string;
  /** Whether the set is already on the shelf when the page renders. */
  initialInLibrary: boolean;
  /** Lets a parent list keep its own copy of the state in step. */
  onChange?: (setId: string, inLibrary: boolean) => void;
  className?: string;
}

/**
 * Add or remove one set from the signed-in learner's library.
 *
 * The state is optimistic: the label flips before the request finishes, and
 * flips back with a message if the request fails, so a slow connection does not
 * make the button feel broken.
 *
 * The current state is readable as text ("In your library" / "Add to library")
 * and as `aria-pressed`, never as colour alone. The check mark is decorative and
 * marked `aria-hidden`.
 */
export default function LibraryToggleButton({
  setId,
  initialInLibrary,
  onChange,
  className = '',
}: LibraryToggleButtonProps) {
  const [inLibrary, setInLibrary] = useState(initialInLibrary);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = !inLibrary;
    setInLibrary(next);
    setError(null);
    onChange?.(setId, next);

    startTransition(async () => {
      try {
        const res = next
          ? await fetch('/api/library', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ setId }),
            })
          : await fetch(`/api/library?setId=${encodeURIComponent(setId)}`, {
              method: 'DELETE',
            });

        if (!res.ok) throw new Error(String(res.status));
      } catch {
        setInLibrary(!next);
        onChange?.(setId, !next);
        setError(
          next
            ? 'Could not add that set. Check your connection and try again.'
            : 'Could not remove that set. Check your connection and try again.',
        );
      }
    });
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={inLibrary}
        disabled={isPending}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-60 ${
          inLibrary
            ? 'border-green-600 text-green-700 bg-green-50 hover:bg-green-100'
            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
        }`}
      >
        {inLibrary ? (
          <CheckIcon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <BookmarkIcon className="h-4 w-4" aria-hidden="true" />
        )}
        {inLibrary ? 'In your library' : 'Add to library'}
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {inLibrary ? 'In your library' : 'Not in your library'}
      </p>
      {error && (
        <p className="mt-1 text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
