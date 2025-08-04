'use client';

import { Logger, LogContext } from '@/lib/logging/client-logger';

const DB_NAME = 'FlashlearnAI';
const DB_VERSION = 2; // Incremented version to trigger onupgradeneeded
const STUDY_RESULTS_STORE = 'studyResults';
const SYNC_QUEUE_STORE = 'syncQueue'; // New store for pending syncs

// Define the structure of a single card result
export interface CardResult {
  sessionId: string;
  flashcardId: string;
  isCorrect: boolean;
  timeSeconds: number;
}

// Define the structure of the object in the studyResults store
interface StoredResult extends CardResult {
  id?: number; // auto-incrementing primary key
}

// Define the structure of the object in the syncQueue store
interface QueuedSession {
    sessionId: string;
}


let db: IDBDatabase;

/**
 * Opens and initializes the IndexedDB database.
 * This is now version 2 to add the new syncQueue store.
 * @returns A promise that resolves with the database instance.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'IndexedDB error', { error: request.error });
      reject('Error opening IndexedDB');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    // This event runs only when the DB version changes.
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      
      // Create studyResults store if it doesn't exist
      if (!dbInstance.objectStoreNames.contains(STUDY_RESULTS_STORE)) {
        dbInstance.createObjectStore(STUDY_RESULTS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
      
      // **1. Create the "Sync Queue" Object Store**
      if (!dbInstance.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        // This store will hold the sessionIds that need to be synced.
        // We use 'sessionId' as the keyPath to ensure no duplicates.
        dbInstance.createObjectStore(SYNC_QUEUE_STORE, {
          keyPath: 'sessionId',
        });
      }
    };
  });
}

/**
 * Saves a single card result to IndexedDB.
 * @param result The card result to save.
 */
export async function saveResult(result: CardResult): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STUDY_RESULTS_STORE, 'readwrite');
    const store = transaction.objectStore(STUDY_RESULTS_STORE);
    const request = store.add(result);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error saving result to IndexedDB', { error: request.error });
      reject('Could not save result.');
    };
  });
}

/**
 * Retrieves all results for a given session ID from IndexedDB.
 * @param sessionId The ID of the session to retrieve results for.
 * @returns A promise that resolves with an array of card results.
 */
export async function getResults(sessionId: string): Promise<CardResult[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STUDY_RESULTS_STORE, 'readonly');
    const store = transaction.objectStore(STUDY_RESULTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const allResults = request.result as StoredResult[];
      // Filter results for the specific session
      resolve(allResults.filter(r => r.sessionId === sessionId));
    };

    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error getting results from IndexedDB', { error: request.error });
      reject('Could not get results.');
    };
  });
}

/**
 * Clears all results for a given session ID from IndexedDB.
 * @param sessionId The ID of the session to clear results for.
 */
export async function clearResults(sessionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STUDY_RESULTS_STORE, 'readwrite');
    const store = transaction.objectStore(STUDY_RESULTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const allResults = request.result as StoredResult[];
      for (const result of allResults) {
        if (result.sessionId === sessionId) {
          store.delete(result.id!);
        }
      }
      resolve();
    };

    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error clearing results from IndexedDB', { error: request.error });
      reject('Could not clear results.');
    };
  });
}

// --- New Functions for Syncing ---

/**
 * **2. Adds a completed session's ID to the sync queue.**
 * This is called when a session is completed offline.
 * @param sessionId The ID of the session to queue.
 */
export async function queueSessionForSync(sessionId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE);
        const request = store.add({ sessionId });

        request.onsuccess = () => {
            Logger.log(LogContext.SYSTEM, 'Session queued for sync', { sessionId });
            resolve();
        };
        request.onerror = () => {
            // It might fail if the session is already in the queue, which is fine.
            if (request.error?.name === 'ConstraintError') {
                Logger.log(LogContext.SYSTEM, 'Session already in sync queue', { sessionId });
                return resolve();
            }
            Logger.error(LogContext.SYSTEM, 'Error queuing session for sync', { error: request.error });
            reject('Could not queue session.');
        };
    });
}

/**
 * **3. Retrieves all session IDs from the sync queue.**
 * @returns A promise that resolves with an array of session IDs.
 */
export async function getQueuedSessions(): Promise<string[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE, 'readonly');
        const store = transaction.objectStore(SYNC_QUEUE_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
            const queuedItems = request.result as QueuedSession[];
            resolve(queuedItems.map(item => item.sessionId));
        };
        request.onerror = () => {
            Logger.error(LogContext.SYSTEM, 'Error getting queued sessions', { error: request.error });
            reject('Could not get queued sessions.');
        };
    });
}

/**
 * **3. Removes a session ID from the sync queue.**
 * This is called after a session's data has been successfully sent to the server.
 * @param sessionId The ID of the session to remove.
 */
export async function removeSessionFromQueue(sessionId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE);
        const request = store.delete(sessionId);

        request.onsuccess = () => {
            Logger.log(LogContext.SYSTEM, 'Session removed from sync queue', { sessionId });
            resolve();
        };
        request.onerror = () => {
            Logger.error(LogContext.SYSTEM, 'Error removing session from sync queue', { error: request.error });
            reject('Could not remove session from queue.');
        };
    });
}
