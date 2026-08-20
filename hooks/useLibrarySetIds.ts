'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Which sets are already on the signed-in learner's shelf.
 *
 * One request per page rather than one per card: `GET /api/library?view=ids`
 * returns ids only, so a browse page with twenty cards still costs a single
 * round trip. Signed-out visitors skip the request entirely.
 */
export function useLibrarySetIds(enabled: boolean) {
  const [setIds, setSetIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsLoaded(true);
      return;
    }
    let cancelled = false;

    fetch('/api/library?view=ids')
      .then((res) => (res.ok ? res.json() : { setIds: [] }))
      .then((data) => {
        if (cancelled) return;
        setSetIds(new Set<string>(data.setIds || []));
      })
      .catch(() => {
        // A failed lookup shows every card as "Add to library". The POST is an
        // upsert, so adding one that is already there is harmless.
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  /** Keeps the local copy in step with an optimistic toggle. */
  const markLocal = useCallback((setId: string, inLibrary: boolean) => {
    setSetIds((prev) => {
      const next = new Set(prev);
      if (inLibrary) next.add(setId);
      else next.delete(setId);
      return next;
    });
  }, []);

  return { setIds, isLoaded, markLocal };
}
