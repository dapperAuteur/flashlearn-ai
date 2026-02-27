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
import { getPowerSync, isPowerSyncInitialized } from '@/lib/powersync/client';
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

export type SyncEventType =
  | 'status-change'
  | 'sync-start'
  | 'sync-progress'
  | 'sync-complete'
  | 'sync-error';

export interface SyncEventData {
  type: SyncEventType;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  error?: string;
  lastSyncedAt?: Date;
}

export type SyncEventListener = (data: SyncEventData) => void;

// ============================================================================
// UNIFIED OFFLINE SYNC SERVICE
// ============================================================================
export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private syncInProgress = false;
  private retryTimeout: NodeJS.Timeout | null = null;
  private periodicSyncInterval: NodeJS.Timeout | null = null;
  private listeners = new Set<SyncEventListener>();
  private _pendingCount = 0;
  private _syncedCount = 0;
  private _lastSyncedAt: Date | null = null;

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
  // EVENT EMITTER
  // ============================================================================

  subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(type: SyncEventType, extra?: { error?: string }) {
    const data: SyncEventData = {
      type,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: this.syncInProgress,
      pendingCount: this._pendingCount,
      syncedCount: this._syncedCount,
      lastSyncedAt: this._lastSyncedAt ?? undefined,
      ...extra,
    };
    this.listeners.forEach(fn => fn(data));
  }

  async getPendingCount(): Promise<number> {
    try {
      const [sessions, changes] = await Promise.all([
        getQueuedSessions(),
        getPendingChanges(),
      ]);
      return sessions.length + changes.length;
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handleOnline(): void {
    Logger.log(LogContext.SYSTEM, 'Connection restored, starting sync');
    this.emit('status-change');
    this.syncAllPendingData();
    this.startPeriodicSync();
  }

  private handleOffline(): void {
    Logger.log(LogContext.SYSTEM, 'Connection lost');
    this.emit('status-change');
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
   * 1. Pull flashcard data from server into PowerSync local DB
   * 2. Push pending changes (sets/categories) to server
   * 3. Push queued study sessions to server
   */
  async syncAllPendingData(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    this._syncedCount = 0;
    this._pendingCount = await this.getPendingCount();
    Logger.log(LogContext.SYSTEM, 'Starting offline data sync');
    this.emit('sync-start');

    try {
      // Pull flashcard data from server into PowerSync
      await this.pullFlashcardData();

      // Push pending changes (sets/categories created offline)
      await this.syncPendingChanges();

      // Push study sessions (not in PowerSync schema)
      await this.syncStudySessions();

      this._lastSyncedAt = new Date();
      this.syncInProgress = false;
      Logger.log(LogContext.SYSTEM, 'Offline sync completed successfully');
      this.emit('sync-complete');
    } catch (error) {
      this.syncInProgress = false;
      Logger.error(LogContext.SYSTEM, 'Sync failed, will retry', { error });
      this.emit('sync-error', { error: error instanceof Error ? error.message : 'Sync failed' });
      this.scheduleRetry();
    }
  }

  // ============================================================================
  // FLASHCARD DATA PULL (Server → PowerSync)
  // ============================================================================

  /**
   * Pull flashcard data from the server into the local PowerSync database.
   * Uses the /api/powersync endpoint which returns changes since last sync.
   * Only runs for authenticated users (the endpoint requires auth via cookies).
   */
  private async pullFlashcardData(): Promise<void> {
    if (!isPowerSyncInitialized()) return;

    try {
      // Check if the user is authenticated by peeking at the session
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      if (!session?.user?.id) return; // Not authenticated, skip pull

      const lastSyncedAt = localStorage.getItem('powersync_last_synced_at') || '';
      const url = lastSyncedAt
        ? `/api/powersync?last_synced_at=${encodeURIComponent(lastSyncedAt)}`
        : '/api/powersync';

      const response = await fetch(url);
      if (!response.ok) {
        Logger.warning(LogContext.SYSTEM, 'Flashcard pull failed', { status: response.status });
        return;
      }

      const { checkpoint, data } = await response.json();

      if (!data || data.length === 0) {
        if (checkpoint) localStorage.setItem('powersync_last_synced_at', checkpoint);
        return;
      }

      const db = getPowerSync();

      // Process sets first, then cards, to ensure deduplication happens before card insertion
      const setChanges = data.filter((c: { type: string }) => c.type === 'flashcard_sets');
      const cardChanges = data.filter((c: { type: string }) => c.type === 'flashcards');

      for (const change of setChanges) {
        try {
          if (change.data) {
            const d = change.data;

            // Remove local duplicates with same title but different id
            const duplicates = await db.getAll<{ id: string }>(
              'SELECT id FROM flashcard_sets WHERE title = ? AND user_id = ? AND id != ?',
              [d.title, d.user_id, d.id]
            );
            for (const dup of duplicates) {
              await db.execute('DELETE FROM flashcards WHERE set_id = ?', [dup.id]);
              await db.execute('DELETE FROM flashcard_sets WHERE id = ?', [dup.id]);
              Logger.log(LogContext.SYSTEM, 'Removed duplicate local set', { dupId: dup.id, keptId: d.id, title: d.title });
            }

            await db.execute(
              `INSERT OR REPLACE INTO flashcard_sets (id, user_id, title, description, is_public, card_count, source, created_at, updated_at, is_deleted)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [d.id, d.user_id, d.title, d.description || null, d.is_public, d.card_count, d.source, d.created_at, d.updated_at, d.is_deleted ?? 0]
            );
          }
        } catch (err) {
          Logger.warning(LogContext.SYSTEM, 'Failed to apply set change', { change, err });
        }
      }

      for (const change of cardChanges) {
        try {
          if (change.data) {
            const d = change.data;
            await db.execute(
              `INSERT OR REPLACE INTO flashcards (id, set_id, user_id, front, back, front_image, back_image, "order", created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [d.id, d.set_id, d.user_id, d.front, d.back, d.front_image || null, d.back_image || null, d.order, d.created_at, d.updated_at]
            );
          }
        } catch (err) {
          Logger.warning(LogContext.SYSTEM, 'Failed to apply pull change', { change, err });
        }
      }

      if (checkpoint) localStorage.setItem('powersync_last_synced_at', checkpoint);
      Logger.log(LogContext.SYSTEM, `Pulled ${data.length} flashcard changes from server`);
    } catch (error) {
      Logger.warning(LogContext.SYSTEM, 'Flashcard data pull error', { error });
      // Non-fatal — don't throw, let the rest of sync continue
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
        this._syncedCount++;
        this._pendingCount = Math.max(0, this._pendingCount - 1);
        Logger.log(LogContext.SYSTEM, 'Pending change synced', { changeId: change.id });
        this.emit('sync-progress');

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
        this._syncedCount++;
        this._pendingCount = Math.max(0, this._pendingCount - 1);
        Logger.log(LogContext.SYSTEM, 'Study session synced successfully', {
          sessionId
        });
        this.emit('sync-progress');
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

      // Fetch session history for metadata
      const historyEntry = await getStudyHistoryBySessionId(sessionId);

      // Use history entry's setId (saved from flashcard set) with fallback to extraction
      const setId = (historyEntry?.setId && historyEntry.setId !== 'unknown')
        ? historyEntry.setId
        : this.extractSetId(sessionId, results);

      // Build flat payload for /api/study/sessions/sync endpoint
      // Map flashcardId → cardId since server expects cardId field
      const payload = {
        sessionId,
        setId,
        setName: historyEntry?.setName || 'Study Set',
        totalCards: historyEntry?.totalCards ?? results.length,
        correctCount: historyEntry?.correctCount ?? results.filter(r => r.isCorrect).length,
        incorrectCount: historyEntry?.incorrectCount ?? results.filter(r => !r.isCorrect).length,
        durationSeconds: historyEntry?.durationSeconds ?? 0,
        startTime: historyEntry?.startTime ? new Date(historyEntry.startTime).toISOString() : new Date().toISOString(),
        endTime: historyEntry?.endTime ? new Date(historyEntry.endTime).toISOString() : new Date().toISOString(),
        studyDirection: historyEntry?.studyDirection || 'front-to-back',
        results: results.map(r => ({
          cardId: r.flashcardId || (r as any).cardId,
          isCorrect: r.isCorrect,
          timeSeconds: r.timeSeconds,
          confidenceRating: r.confidenceRating,
        })),
      };

      Logger.log(LogContext.STUDY, `Syncing session to server (attempt ${attempt})`, {
        sessionId,
        resultCount: results.length,
        setId
      });

      const response = await fetch('/api/study/sessions/sync', {
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