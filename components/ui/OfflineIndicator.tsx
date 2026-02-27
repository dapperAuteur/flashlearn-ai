'use client';

import { WifiOff, Loader2 } from 'lucide-react';
import { useNetworkSync } from '@/hooks/useNetworkSync';

export default function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, syncedCount } = useNetworkSync();

  const showBar = !isOnline || (isSyncing && pendingCount > 0);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        showBar ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {!isOnline ? (
        <div className="bg-amber-600 text-white px-4 py-3 flex items-center justify-center shadow-lg">
          <WifiOff className="h-4 w-4 mr-2 flex-shrink-0" />
          <p className="text-sm font-medium">
            You&apos;re offline &mdash; progress saved locally
          </p>
        </div>
      ) : isSyncing && pendingCount > 0 ? (
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-center shadow-lg">
          <Loader2 className="h-4 w-4 mr-2 flex-shrink-0 animate-spin" />
          <p className="text-sm font-medium">
            Syncing {syncedCount} of {syncedCount + pendingCount} item{syncedCount + pendingCount !== 1 ? 's' : ''}...
          </p>
        </div>
      ) : null}
    </div>
  );
}
