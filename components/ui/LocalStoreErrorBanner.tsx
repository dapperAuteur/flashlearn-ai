'use client';

import { AlertTriangle } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface LocalStoreErrorBannerProps {
  /** True when the local SQLite store failed to open at startup. */
  failed: boolean;
}

/**
 * Shown when the local read cache fails to open.
 *
 * Without it the app degrades silently: PowerSync init throws, the context gets
 * null, every local query returns nothing, and a user with fifty sets is told
 * they have none. This says what went wrong in the user's terms instead.
 *
 * Three deliberate choices:
 *
 * - Not a blocking screen. Nothing server-backed depends on the local store, so
 *   study, generation, and every API-driven screen keep working online. Taking
 *   the app away would be a bigger failure than the one being reported.
 * - Not dismissible. The store stays broken until the page is reloaded or the
 *   browser's storage setting changes, so a dismiss button would only hide a
 *   problem that is still there.
 * - Signed-in users only. A visitor reading the landing page has no offline
 *   copy to lose and no action to take.
 *
 * The state is carried by the heading text, not by the amber styling, so it
 * reads the same to a screen reader, in high-contrast mode, and to anyone who
 * does not see the colour.
 */
export default function LocalStoreErrorBanner({ failed }: LocalStoreErrorBannerProps) {
  const { status } = useSession();

  if (!failed || status !== 'authenticated') return null;

  return (
    <div
      role="alert"
      className="border-b border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
        <AlertTriangle
          className="h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-300"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Offline study is not available on this device
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            This browser would not open the offline copy of your sets. Your sets are safe on the
            server, and studying, generating, and everything else still works while you are online.
            Reloading the page often fixes it. Private and incognito windows, and browsers set to
            block site storage, cannot keep an offline copy at all.
          </p>
        </div>
      </div>
    </div>
  );
}
