'use client';

import { useState, useEffect } from 'react';
import { syncOfflineData } from '@/lib/services/syncService';
import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * A custom React hook to manage the application's online/offline state
 * and trigger data synchronization when the connection is restored.
 */
export function useSync() {
  // Initialize state from the browser's current online status
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? window.navigator.onLine : true
  );

  useEffect(() => {
    // Handler to update state when the browser goes online
    const handleOnline = () => {
      Logger.log(LogContext.SYSTEM, 'Application is back online.');
      setIsOnline(true);
      // Trigger the sync process automatically
      syncOfflineData();
    };

    // Handler to update state when the browser goes offline
    const handleOffline = () => {
      Logger.log(LogContext.SYSTEM, 'Application is offline.');
      setIsOnline(false);
    };

    // Add event listeners for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check and sync attempt on component mount, in case there's pending data
    if (isOnline) {
      syncOfflineData();
    }

    // Cleanup function to remove event listeners when the component unmounts
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]); // Rerun effect if isOnline changes, though it's mainly for the initial check

  return { isOnline };
}
