'use client';

import { WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import { useNetworkSync } from '@/hooks/useNetworkSync';
import Link from 'next/link';

export default function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, syncedCount, conflictCount } = useNetworkSync();

  const showBar = !isOnline || (isSyncing && pendingCount > 0) || conflictCount > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        showBar ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {!isOnline ? (
        <div className="bg-amber-600 text-white px-4 py-3 flex items-center justify-center shadow-lg">
          <WifiOff className="h-4 w-4 mr-2 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">
            You&apos;re offline &mdash; progress saved locally
          </p>
        </div>
      ) : conflictCount > 0 ? (
        <div className="bg-red-600 text-white px-4 py-3 shadow-lg">
          <div className="flex items-center justify-center gap-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm font-medium">
              {conflictCount} sync conflict{conflictCount !== 1 ? 's' : ''} need{conflictCount === 1 ? 's' : ''} your review
            </p>
            <Link
              href="/dashboard/conflicts"
              className="text-sm font-semibold underline underline-offset-2 hover:text-red-100 transition-colors"
            >
              Review
            </Link>
          </div>
        </div>
      ) : isSyncing && pendingCount > 0 ? (
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-center shadow-lg">
          <Loader2 className="h-4 w-4 mr-2 flex-shrink-0 animate-spin" aria-hidden="true" />
          <p className="text-sm font-medium">
            Syncing {syncedCount} of {syncedCount + pendingCount} item{syncedCount + pendingCount !== 1 ? 's' : ''}...
          </p>
        </div>
      ) : null}
    </div>
  );
}
