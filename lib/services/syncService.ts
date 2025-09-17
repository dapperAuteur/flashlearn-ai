'use client';

import { Logger, LogContext } from '@/lib/logging/client-logger';
import { 
    getQueuedSessions, 
    getResults, 
    clearResults, 
    removeSessionFromQueue 
} from '@/lib/db/indexeddb';

/**
 * The main function to synchronize offline data with the server.
 * It processes the sync queue and sends the data to the API.
 */
export async function syncOfflineData(): Promise<void> {
    Logger.log(LogContext.SYSTEM, 'Checking for data to sync...');

    try {
        const queuedSessionIds = await getQueuedSessions();

        if (queuedSessionIds.length === 0) {
            Logger.log(LogContext.SYSTEM, 'No data in sync queue.');
            return;
        }

        Logger.log(LogContext.SYSTEM, `Found ${queuedSessionIds.length} session(s) to sync.`);

        for (const sessionId of queuedSessionIds) {
            try {
                const resultsToSync = await getResults(sessionId);
                
                if (resultsToSync.length === 0) {
                    // If there are no results, just clean up the queue
                    await removeSessionFromQueue(sessionId);
                    continue;
                }

                // Attempt to send the results to the server
                const response = await fetch(`/api/study/sessions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        setId: sessionId, // **FIXED: Changed key from 'sessionId' to 'setId'**
                        results: resultsToSync
                    }),
                });

                if (response.ok) {
                    Logger.log(LogContext.STUDY, 'Successfully synced session to server', { sessionId });
                    // On success, clear the data from IndexedDB
                    await clearResults(sessionId);
                    await removeSessionFromQueue(sessionId);
                } else {
                    // If the API fails, log the error but leave the data in IndexedDB to be retried later.
                    const errorData = await response.json();
                    Logger.error(LogContext.STUDY, 'API error during sync', { 
                        sessionId, 
                        status: response.status,
                        error: errorData.error || 'Unknown API error'
                    });
                }
            } catch (error) {
                // Handle network errors or other exceptions during the fetch
                Logger.error(LogContext.SYSTEM, 'Failed to sync session', { sessionId, error });
                // We break the loop here to avoid repeated network errors.
                // The service will try again on the next online event.
                break; 
            }
        }
    } catch (dbError) {
        Logger.error(LogContext.SYSTEM, 'Failed to get sync queue from IndexedDB', { dbError });
    }
}