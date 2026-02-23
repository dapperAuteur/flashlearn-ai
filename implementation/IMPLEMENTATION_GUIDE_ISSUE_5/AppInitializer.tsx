// components/providers/AppInitializer.tsx
'use client';

import { useEffect } from 'react';
import { setupBackgroundSync } from '@/lib/sync/session-sync';
import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * Initializes app-wide services like background sync
 * Place this component in your root layout
 */
export default function AppInitializer() {
  useEffect(() => {
    // Setup background sync once on app load
    try {
      setupBackgroundSync();
      Logger.log(LogContext.SYSTEM, 'App services initialized');
    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Failed to initialize app services', { error });
    }
  }, []);

  // This component doesn't render anything
  return null;
}
