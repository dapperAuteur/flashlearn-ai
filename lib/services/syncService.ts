/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/services/syncService.ts
'use client';

import {
  getPendingChanges,
  removePendingChange,
  getQueuedSessions,
  removeSessionFromQueue,
  getResults,
  getStudyHistoryBySessionId
} from '@/lib/db/indexeddb';
import { Logger, LogContext } from '@/lib/logging/client-logger';

// ============================================================================
// CONSTANTS
// ============================================================================
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const PERIODIC_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const FAILED_SYNC_RETRY_DELAY_MS = 30000; // 30 seconds

// ============================================================================
// TYPES
// ============================================================================
interface SyncResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

interface SessionSyncPayload {
  setId: string;
  results: any[];
  sessionId: string;
  sessionMeta?: {
    setName: string;
    startTime: string;
    endTime: string;
    totalCards: number;
    correctCount: number;
    incorrectCount: number;
    durationSeconds: number;
    studyDirection: string;
  };
}

// ============================================================================
// UNIFIED OFFLINE SYNC SERVICE
// ============================================================================
export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private syncInProgress = false;
  private retryTimeout: NodeJS.Timeout | null = null;
  private periodicSyncInterval: NodeJS.Timeout | null = null;

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  /**
   * Initialize sync service with online/offline listeners and periodic sync
   * Call this once during app startup
   */
  initialize(): void {
    if (typeof window === 'undefined') return;

    // Set up online/offline event listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Start periodic sync if online
    if (navigator.onLine) {
      this.syncAllPendingData();
      this.startPeriodicSync();
    }

    Logger.log(LogContext.SYSTEM, 'OfflineSyncService initialized');
  }

  /**
   * Clean up resources (call on app unmount/logout)
   */
  cleanup(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
      this.periodicSyncInterval = null;
    }
    Logger.log(LogContext.SYSTEM, 'OfflineSyncService cleaned up');
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handleOnline(): void {
    Logger.log(LogContext.SYSTEM, 'Connection restored, starting sync');
    this.syncAllPendingData();
    this.startPeriodicSync();
  }

  private handleOffline(): void {
    Logger.log(LogContext.SYSTEM, 'Connection lost');
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
      this.periodicSyncInterval = null;
    }
  }

  private startPeriodicSync(): void {
    if (this.periodicSyncInterval) return; // Already running

    this.periodicSyncInterval = setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        Logger.log(LogContext.SYSTEM, 'Periodic sync triggered');
        this.syncAllPendingData();
      }
    }, PERIODIC_SYNC_INTERVAL_MS);
  }

  // ============================================================================
  // MAIN SYNC ORCHESTRATION
  // ============================================================================

  /**
   * Main sync function - syncs all pending data
   * PowerSync handles flashcard sets/cards automatically
   * This service handles study sessions and other manual syncs
   */
  async syncAllPendingData(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    Logger.log(LogContext.SYSTEM, 'Starting offline data sync');

    try {
      // Sync pending changes (sets/categories created offline)
      await this.syncPendingChanges();
      
      // Sync study sessions (not in PowerSync schema)
      await this.syncStudySessions();
      
      Logger.log(LogContext.SYSTEM, 'Offline sync completed successfully');
    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Sync failed, will retry', { error });
      this.scheduleRetry();
    } finally {
      this.syncInProgress = false;
    }
  }

  // ============================================================================
  // PENDING CHANGES SYNC (Sets/Categories)
  // ============================================================================

  private async syncPendingChanges(): Promise<void> {
    const pendingChanges = await getPendingChanges();
    
    if (pendingChanges.length === 0) {
      return;
    }

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
        Logger.log(LogContext.SYSTEM, 'Pending change synced', { changeId: change.id });
        
      } catch (error) {
        Logger.error(LogContext.SYSTEM, 'Failed to sync change', { 
          changeId: change.id, 
          error 
        });
        
        // Increment retry count
        change.retryCount = (change.retryCount || 0) + 1;
        
        // Remove after max retries
        if (change.retryCount >= MAX_RETRY_ATTEMPTS) {
          Logger.error(LogContext.SYSTEM, 'Max retries exceeded, removing change', { 
            changeId: change.id 
          });
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
    Logger.log(LogContext.SYSTEM, 'Category change synced via sets', { 
      changeId: change.id 
    });
  }

  // ============================================================================
  // STUDY SESSIONS SYNC (Enhanced with retry logic)
  // ============================================================================

  /**
   * Sync all queued study sessions to server
   * Study sessions are NOT in PowerSync schema - they go directly to MongoDB
   */
  private async syncStudySessions(): Promise<void> {
    const queuedSessions = await getQueuedSessions();
    
    if (queuedSessions.length === 0) {
      return;
    }

    Logger.log(LogContext.SYSTEM, `Syncing ${queuedSessions.length} study sessions`);

    // Process sessions sequentially to avoid overwhelming the server
    for (const sessionId of queuedSessions) {
      const result = await this.syncSingleSession(sessionId);
      
      if (result.success) {
        Logger.log(LogContext.SYSTEM, 'Study session synced successfully', { 
          sessionId 
        });
      } else {
        Logger.warning(LogContext.SYSTEM, 'Study session sync failed', { 
          sessionId,
          error: result.error 
        });
      }
    }
  }

  /**
   * Sync a single session with retry logic
   */
  private async syncSingleSession(
    sessionId: string, 
    attempt: number = 1
  ): Promise<SyncResult> {
    try {
      // Get results from IndexedDB
      const results = await getResults(sessionId);
      
      if (results.length === 0) {
        Logger.warning(LogContext.STUDY, 'No results found for session', { sessionId });
        await removeSessionFromQueue(sessionId);
        return { success: false, sessionId, error: 'No results found' };
      }

      // Extract setId from sessionId or results
      const setId = this.extractSetId(sessionId, results);

      // Fetch session history for metadata
      const historyEntry = await getStudyHistoryBySessionId(sessionId);

      const payload: SessionSyncPayload = {
        setId,
        results,
        sessionId,
        ...(historyEntry && {
          sessionMeta: {
            setName: historyEntry.setName,
            startTime: new Date(historyEntry.startTime).toISOString(),
            endTime: historyEntry.endTime ? new Date(historyEntry.endTime).toISOString() : new Date().toISOString(),
            totalCards: historyEntry.totalCards,
            correctCount: historyEntry.correctCount,
            incorrectCount: historyEntry.incorrectCount,
            durationSeconds: historyEntry.durationSeconds,
            studyDirection: historyEntry.studyDirection || 'front-to-back',
          }
        })
      };

      Logger.log(LogContext.STUDY, `Syncing session to server (attempt ${attempt})`, { 
        sessionId, 
        resultCount: results.length,
        setId
      });

      const response = await fetch('/api/study/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      Logger.log(LogContext.STUDY, 'Session synced successfully', { 
        sessionId,
        serverResponse: data 
      });

      // Remove from queue after successful sync
      await removeSessionFromQueue(sessionId);
      
      return { success: true, sessionId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.STUDY, `Sync failed for session (attempt ${attempt})`, { 
        sessionId, 
        error: errorMessage,
        attempt 
      });

      // Retry logic
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await new Promise(resolve => 
          setTimeout(resolve, RETRY_DELAY_MS * attempt)
        );
        return this.syncSingleSession(sessionId, attempt + 1);
      }

      // Max retries exceeded - keep in queue for next sync cycle
      return { success: false, sessionId, error: errorMessage };
    }
  }

  /**
   * Extract setId from sessionId format or results
   */
  private extractSetId(sessionId: string, results: any[]): string {
    // Format 1: "setId_timestamp"
    if (sessionId.includes('_')) {
      const parts = sessionId.split('_');
      return parts[0];
    }

    // Format 2: "offline-timestamp-setId"
    if (sessionId.startsWith('offline-')) {
      const parts = sessionId.split('-');
      return parts.length > 2 ? parts[2] : 'unknown';
    }

    // Format 3: Try to get from first result's flashcardId
    if (results.length > 0 && results[0].flashcardId) {
      // flashcardId might be "setId_cardId" or just the cardId
      const flashcardId = results[0].flashcardId;
      if (flashcardId.includes('_')) {
        return flashcardId.split('_')[0];
      }
    }

    // Fallback
    return 'unknown';
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Sync a specific session immediately
   * Used after session completion for instant sync
   */
  async syncSession(sessionId: string): Promise<boolean> {
    if (!navigator.onLine) {
      Logger.warning(LogContext.STUDY, 'Cannot sync while offline', { sessionId });
      return false;
    }

    const result = await this.syncSingleSession(sessionId);
    return result.success;
  }

  /**
   * Manual sync trigger for all pending data
   */
  async forceSync(): Promise<boolean> {
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

  /**
   * Check if sync is currently in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }

  // ============================================================================
  // RETRY SCHEDULING
  // ============================================================================

  private scheduleRetry(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    
    Logger.log(LogContext.SYSTEM, 'Scheduling retry in 30 seconds');
    
    this.retryTimeout = setTimeout(() => {
      if (navigator.onLine && !this.syncInProgress) {
        Logger.log(LogContext.SYSTEM, 'Retry timeout triggered');
        this.syncAllPendingData();
      }
    }, FAILED_SYNC_RETRY_DELAY_MS);
  }
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

/**
 * Initialize sync service in browser
 * This runs automatically when the module loads
 */
if (typeof window !== 'undefined') {
  const syncService = OfflineSyncService.getInstance();
  syncService.initialize();
  
  Logger.log(LogContext.SYSTEM, 'OfflineSyncService auto-initialized');
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Convenience function to sync all offline data
 */
export async function syncOfflineData(): Promise<void> {
  const syncService = OfflineSyncService.getInstance();
  await syncService.syncAllPendingData();
}

/**
 * Convenience function to sync a specific session
 */
export async function syncSession(sessionId: string): Promise<boolean> {
  const syncService = OfflineSyncService.getInstance();
  return syncService.syncSession(sessionId);
}

/**
 * Get sync service instance
 */
export function getSyncService(): OfflineSyncService {
  return OfflineSyncService.getInstance();
}