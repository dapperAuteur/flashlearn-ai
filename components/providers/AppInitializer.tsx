'use client';

import { useEffect } from 'react';
import { OfflineSyncService } from '@/lib/services/syncService';
import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * Initializes app-wide services like background sync.
 * Place this component in your root layout.
 */
export default function AppInitializer() {
  useEffect(() => {
    try {
      const syncService = OfflineSyncService.getInstance();
      syncService.initialize();
      Logger.log(LogContext.SYSTEM, 'App services initialized');

      return () => {
        syncService.cleanup();
      };
    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Failed to initialize app services', { error });
    }
  }, []);

  return null;
}
