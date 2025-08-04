'use client';

import { WifiOff } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline: boolean;
}

/**
 * A non-intrusive banner that appears at the bottom of the screen
 * when the application detects it is offline.
 */
export default function OfflineIndicator({ isOnline }: OfflineIndicatorProps) {
  if (isOnline) {
    return null; // Don't render anything if the user is online
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-3 z-50 flex items-center justify-center shadow-lg">
      <WifiOff className="h-5 w-5 mr-3 text-gray-400" />
      <p className="font-semibold">You are currently offline. Your progress will be saved and synced when you reconnect.</p>
    </div>
  );
}
