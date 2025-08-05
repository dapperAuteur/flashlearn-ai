'use client';

import { Logger, LogContext } from '@/lib/logging/client-logger';
import {
    getUnsyncedSessions,
    markSessionAsSynced
} from '@/lib/db/indexeddb';

/**
 * The main function to synchronize offline data with the server.
 * It gets all unsynced sessions and sends them to the API in a single batch.
 */
export async function syncOfflineData(): Promise<void> {
    Logger.log(LogContext.SYSTEM, 'Checking for data to sync...');

    try {
        const sessionsToSync = await getUnsyncedSessions();

        if (sessionsToSync.length === 0) {
            Logger.log(LogContext.SYSTEM, 'No data in sync queue.');
            return;
        }

        Logger.log(LogContext.SYSTEM, `Found ${sessionsToSync.length} session(s) to sync.`);

        // Attempt to send the entire batch of sessions to the server
        const response = await fetch(`/api/study/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessions: sessionsToSync // Send as a batch
            }),
        });

        if (response.ok) {
            Logger.log(LogContext.STUDY, 'Successfully synced session batch to server', { count: sessionsToSync.length });
            // On success, mark each session as synced in IndexedDB
            for (const session of sessionsToSync) {
                await markSessionAsSynced(session.sessionId);
            }
        } else {
            // If the API fails, log the error but leave the data in IndexedDB to be retried later.
            const errorData = await response.json();
            Logger.error(LogContext.STUDY, 'API error during batch sync', { 
                status: response.status,
                error: errorData.error || 'Unknown API error'
            });
        }
    } catch (error) {
        // Handle network errors or other exceptions during the fetch or DB operations
        Logger.error(LogContext.SYSTEM, 'Failed to execute sync operation', { error });
    }
}
