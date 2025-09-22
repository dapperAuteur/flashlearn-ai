/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/services/syncService.ts
'use client';

import { 
  getPendingChanges, 
  removePendingChange, 
  getQueuedSessions,
  removeSessionFromQueue,
  getResults
} from '@/lib/db/indexeddb';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private syncInProgress = false;
  private retryTimeout: NodeJS.Timeout | null = null;

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  // Initialize sync service with online/offline listeners
  initialize(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Sync immediately if already online
    if (navigator.onLine) {
      this.syncAllPendingData();
    }
  }

  private handleOnline(): void {
    Logger.log(LogContext.SYSTEM, 'Connection restored, starting sync');
    this.syncAllPendingData();
  }

  private handleOffline(): void {
    Logger.log(LogContext.SYSTEM, 'Connection lost');
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  // Main sync function - syncs all pending data
  async syncAllPendingData(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    Logger.log(LogContext.SYSTEM, 'Starting offline data sync');

    try {
      // Sync pending set changes first
      await this.syncPendingChanges();
      
      // Then sync study sessions
      await this.syncStudySessions();
      
      Logger.log(LogContext.SYSTEM, 'Offline sync completed successfully');
    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Sync failed, will retry', { error });
      this.scheduleRetry();
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncPendingChanges(): Promise<void> {
    const pendingChanges = await getPendingChanges();
    Logger.log(LogContext.SYSTEM, `Syncing ${pendingChanges.length} pending changes`);

    for (const change of pendingChanges) {
      try {
        switch (change.entity) {
          case 'set':
            await this.syncSetChange(change);
            break;
          case 'category':
            await this.syncCategoryChange(change);
            break;
          default:
            Logger.warning(LogContext.SYSTEM, 'Unknown change type', { change });
        }
        
        await removePendingChange(change.id);
      } catch (error) {
        Logger.error(LogContext.SYSTEM, 'Failed to sync change', { changeId: change.id, error });
        
        // Increment retry count
        change.retryCount = (change.retryCount || 0) + 1;
        
        // Remove after 3 failed attempts
        if (change.retryCount >= 3) {
          Logger.error(LogContext.SYSTEM, 'Max retries exceeded, removing change', { changeId: change.id });
          await removePendingChange(change.id);
        }
      }
    }
  }

  private async syncSetChange(change: any): Promise<void> {
    const { type, data } = change;
    
    switch (type) {
      case 'create':
        await fetch('/api/sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;
        
      case 'update':
        await fetch(`/api/sets/${data._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;
        
      case 'delete':
        await fetch(`/api/sets/${data._id}`, {
          method: 'DELETE'
        });
        break;
    }
  }

  private async syncCategoryChange(change: any): Promise<void> {
    // Category changes are handled through set updates
    Logger.log(LogContext.SYSTEM, 'Category change synced via sets', { changeId: change.id });
  }

  private async syncStudySessions(): Promise<void> {
    const queuedSessions = await getQueuedSessions();
    Logger.log(LogContext.SYSTEM, `Syncing ${queuedSessions.length} study sessions`);

    for (const sessionId of queuedSessions) {
      try {
        const results = await getResults(sessionId);
        
        if (results.length === 0) {
          await removeSessionFromQueue(sessionId);
          continue;
        }

        // Extract setId from sessionId
        let setId: string;
        if (sessionId.startsWith('offline-')) {
          // Format: offline-timestamp-setId
          const parts = sessionId.split('-');
          setId = parts[2]; // Get the setId part
        } else {
          // For online sessions, try to determine setId from results or use sessionId
          setId = results[0]?.flashcardId ? 'unknown' : sessionId;
        }

        await fetch('/api/study/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            setId, 
            results 
          })
        });

        await removeSessionFromQueue(sessionId);
        Logger.log(LogContext.SYSTEM, 'Study session synced', { sessionId, setId });
        
      } catch (error) {
        Logger.error(LogContext.SYSTEM, 'Failed to sync study session', { sessionId, error });
      }
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    
    // Retry in 30 seconds
    this.retryTimeout = setTimeout(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.syncAllPendingData();
      }
    }, 30000);
  }

  // Manual sync trigger
  async forcSync(): Promise<boolean> {
    if (!navigator.onLine) {
      Logger.warning(LogContext.SYSTEM, 'Cannot sync while offline');
      return false;
    }

    try {
      await this.syncAllPendingData();
      return true;
    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Force sync failed', { error });
      return false;
    }
  }
}

// Initialize sync service in browser
if (typeof window !== 'undefined') {
  const syncService = OfflineSyncService.getInstance();
  syncService.initialize();
}

// Export convenience function for external use
export async function syncOfflineData(): Promise<void> {
  const syncService = OfflineSyncService.getInstance();
  await syncService.syncAllPendingData();
}