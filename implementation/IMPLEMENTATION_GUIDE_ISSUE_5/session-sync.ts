// lib/sync/session-sync.ts
import { CardResult, getResults, removeSessionFromQueue, getQueuedSessions } from '@/lib/db/indexeddb';
import { Logger, LogContext } from '@/lib/logging/client-logger';

interface SyncResult {
  success: boolean;
  sessionId: string;
  error?: string;
}

interface SessionSyncPayload {
  setId: string;
  results: CardResult[];
  sessionId: string;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Syncs a single session to the server
 * Returns true if successful, false otherwise
 */
async function syncSessionToServer(sessionId: string, attempt: number = 1): Promise<SyncResult> {
  try {
    // Get results from IndexedDB
    const results = await getResults(sessionId);
    
    if (results.length === 0) {
      Logger.warning(LogContext.STUDY, 'No results found for session', { sessionId });
      return { success: false, sessionId, error: 'No results found' };
    }

    // Extract setId from first result
    const setId = results[0]?.flashcardId?.split('_')[0] || 'unknown';

    const payload: SessionSyncPayload = {
      setId,
      results,
      sessionId
    };

    Logger.log(LogContext.STUDY, `Syncing session to server (attempt ${attempt})`, { 
      sessionId, 
      resultCount: results.length 
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
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      return syncSessionToServer(sessionId, attempt + 1);
    }

    return { success: false, sessionId, error: errorMessage };
  }
}

/**
 * Process all queued sessions
 * Called when app comes online or periodically
 */
export async function processQueuedSessions(): Promise<SyncResult[]> {
  try {
    const queuedSessionIds = await getQueuedSessions();
    
    if (queuedSessionIds.length === 0) {
      Logger.log(LogContext.STUDY, 'No sessions in sync queue');
      return [];
    }

    Logger.log(LogContext.STUDY, 'Processing sync queue', { 
      count: queuedSessionIds.length 
    });

    // Process sessions sequentially to avoid overwhelming the server
    const results: SyncResult[] = [];
    for (const sessionId of queuedSessionIds) {
      const result = await syncSessionToServer(sessionId);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    Logger.log(LogContext.STUDY, 'Sync queue processed', { 
      total: results.length,
      successful: successCount,
      failed: results.length - successCount
    });

    return results;

  } catch (error) {
    Logger.error(LogContext.STUDY, 'Error processing sync queue', { error });
    return [];
  }
}

/**
 * Sync a specific session immediately
 * Used after session completion
 */
export async function syncSession(sessionId: string): Promise<boolean> {
  const result = await syncSessionToServer(sessionId);
  return result.success;
}

/**
 * Setup periodic sync and online event listener
 * Call this once during app initialization
 */
export function setupBackgroundSync() {
  // Process queue when coming online
  window.addEventListener('online', () => {
    Logger.log(LogContext.STUDY, 'Device came online, processing sync queue');
    processQueuedSessions();
  });

  // Periodic sync every 5 minutes if online
  setInterval(() => {
    if (navigator.onLine) {
      processQueuedSessions();
    }
  }, 5 * 60 * 1000);

  Logger.log(LogContext.STUDY, 'Background sync initialized');
}
