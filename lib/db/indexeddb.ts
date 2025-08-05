/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Logger, LogContext } from '@/lib/logging/client-logger';

// --- CONSTANTS AND INTERFACES ---

const DB_NAME = 'FlashlearnAI';
const DB_VERSION = 3; // Version incremented to handle schema upgrade

// New and Renamed Object Stores
const OFFLINE_DECKS_STORE = 'offlineDecks';
const OFFLINE_SESSIONS_STORE = 'offlineSessions';
const OFFLINE_SESSION_RESULTS_STORE = 'offlineSessionResults';

// Deprecated Stores (will be removed in a future version)
const DEPRECATED_SYNC_QUEUE_STORE = 'syncQueue';
const DEPRECATED_STUDY_RESULTS_STORE = 'studyResults';


// Structure for a downloaded flashcard deck
export interface OfflineDeck {
  setId: string;
  title: string;
  flashcards: any[]; // Using 'any' for flexibility with flashcard structure
}

// Structure for a single card result
export interface CardResult {
  sessionId: string;
  flashcardId: string;
  isCorrect: boolean;
  timeSeconds: number;
}

// Structure for tracking an offline study session
export interface OfflineSession {
    sessionId: string; // UUID generated on the client
    setId: string;
    startTime: Date;
    endTime?: Date;
    isCompleted: boolean;
    isSynced: boolean;
}

// Structure for combining session data with its results for syncing
export interface SessionWithResults extends OfflineSession {
    results: CardResult[];
}


let db: IDBDatabase;

/**
 * Opens and initializes the IndexedDB database.
 * Handles schema upgrades when the DB_VERSION changes.
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

    // This event runs only when the DB version changes, handling schema creation and migration.
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      Logger.log(LogContext.SYSTEM, `Upgrading IndexedDB to version ${DB_VERSION}`);

      // 1. Create offlineDecks store
      if (!dbInstance.objectStoreNames.contains(OFFLINE_DECKS_STORE)) {
        dbInstance.createObjectStore(OFFLINE_DECKS_STORE, { keyPath: 'setId' });
        Logger.log(LogContext.SYSTEM, `Created '${OFFLINE_DECKS_STORE}' object store.`);
      }

      // 2. Create offlineSessions store
      if (!dbInstance.objectStoreNames.contains(OFFLINE_SESSIONS_STORE)) {
        const sessionStore = dbInstance.createObjectStore(OFFLINE_SESSIONS_STORE, { keyPath: 'sessionId' });
        sessionStore.createIndex('isSynced', 'isSynced', { unique: false });
        Logger.log(LogContext.SYSTEM, `Created '${OFFLINE_SESSIONS_STORE}' object store.`);
      }

      // 3. Create the new offlineSessionResults store (renamed from studyResults)
      if (!dbInstance.objectStoreNames.contains(OFFLINE_SESSION_RESULTS_STORE)) {
        dbInstance.createObjectStore(OFFLINE_SESSION_RESULTS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        // You could add migration logic here to move data from the old store if needed
        Logger.log(LogContext.SYSTEM, `Created '${OFFLINE_SESSION_RESULTS_STORE}' object store.`);
      }
    };
  });
}

// --- NEW DATA MANAGEMENT FUNCTIONS ---

/**
 * Saves a full flashcard deck to IndexedDB for offline access.
 * @param deck The deck object to save.
 */
export async function downloadDeck(deck: OfflineDeck): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OFFLINE_DECKS_STORE, 'readwrite');
    const store = transaction.objectStore(OFFLINE_DECKS_STORE);
    const request = store.put(deck); // Use put to allow overwriting/updating a deck

    request.onsuccess = () => {
        Logger.log(LogContext.SYSTEM, 'Deck downloaded for offline use', { setId: deck.setId });
        resolve();
    };
    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error downloading deck', { error: request.error });
      reject('Could not download deck.');
    };
  });
}

/**
 * Retrieves a single offline deck from IndexedDB.
 * @param setId The ID of the deck to retrieve.
 * @returns A promise that resolves with the deck object or null if not found.
 */
export async function getOfflineDeck(setId: string): Promise<OfflineDeck | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OFFLINE_DECKS_STORE, 'readonly');
    const store = transaction.objectStore(OFFLINE_DECKS_STORE);
    const request = store.get(setId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error getting offline deck', { error: request.error });
      reject('Could not retrieve offline deck.');
    };
  });
}

/**
 * Checks if a deck is available for offline use.
 * @param setId The ID of the deck to check.
 * @returns A promise that resolves with true if the deck is offline, false otherwise.
 */
export async function isDeckOffline(setId: string): Promise<boolean> {
    const db = await openDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(OFFLINE_DECKS_STORE, 'readonly');
        const store = transaction.objectStore(OFFLINE_DECKS_STORE);
        // Use a key-only request for performance
        const request = store.getKey(setId);
        request.onsuccess = () => {
            resolve(!!request.result);
        };
        request.onerror = () => {
            // On error, assume it's not available
            resolve(false);
        };
    });
}

/**
 * Creates a new record for an offline study session.
 * @param setId The ID of the deck being studied.
 * @returns A promise that resolves with the new unique sessionId.
 */
export async function createOfflineSession(setId: string): Promise<string> {
    const db = await openDB();
    const newSession: OfflineSession = {
        sessionId: self.crypto.randomUUID(),
        setId,
        startTime: new Date(),
        isCompleted: false,
        isSynced: false,
    };
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OFFLINE_SESSIONS_STORE, 'readwrite');
        const store = transaction.objectStore(OFFLINE_SESSIONS_STORE);
        const request = store.add(newSession);

        request.onsuccess = () => {
            Logger.log(LogContext.STUDY, 'Created new offline session', { sessionId: newSession.sessionId });
            resolve(newSession.sessionId);
        };
        request.onerror = () => {
            Logger.error(LogContext.SYSTEM, 'Error creating offline session', { error: request.error });
            reject('Could not create offline session.');
        };
    });
}

/**
 * Marks an offline study session as completed.
 * @param sessionId The ID of the session to complete.
 */
export async function completeOfflineSession(sessionId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OFFLINE_SESSIONS_STORE, 'readwrite');
        const store = transaction.objectStore(OFFLINE_SESSIONS_STORE);
        const request = store.get(sessionId);

        request.onsuccess = () => {
            const session = request.result;
            if (session) {
                session.isCompleted = true;
                session.endTime = new Date();
                store.put(session);
                Logger.log(LogContext.STUDY, 'Marked offline session as complete', { sessionId });
                resolve();
            } else {
                reject('Session not found.');
            }
        };
        request.onerror = () => {
            Logger.error(LogContext.SYSTEM, 'Error completing offline session', { error: request.error });
            reject('Could not complete offline session.');
        };
    });
}

/**
 * Marks a session as successfully synced to the server.
 * @param sessionId The ID of the session to mark as synced.
 */
export async function markSessionAsSynced(sessionId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OFFLINE_SESSIONS_STORE, 'readwrite');
        const store = transaction.objectStore(OFFLINE_SESSIONS_STORE);
        const request = store.get(sessionId);

        request.onsuccess = () => {
            const session = request.result;
            if (session) {
                session.isSynced = true;
                store.put(session);
                Logger.log(LogContext.SYSTEM, 'Marked session as synced', { sessionId });
                resolve();
            } else {
                // This case is unlikely but handled for safety
                resolve();
            }
        };
        request.onerror = () => {
            Logger.error(LogContext.SYSTEM, 'Error marking session as synced', { error: request.error });
            reject('Could not mark session as synced.');
        };
    });
}


/**
 * Retrieves all completed, unsynced sessions along with their card results.
 * This is the primary function for the sync service.
 * @returns A promise that resolves with an array of sessions and their results.
 */
export async function getUnsyncedSessions(): Promise<SessionWithResults[]> {
    const db = await openDB();
    const transaction = db.transaction([OFFLINE_SESSIONS_STORE, OFFLINE_SESSION_RESULTS_STORE], 'readonly');
    const sessionStore = transaction.objectStore(OFFLINE_SESSIONS_STORE);
    const resultsStore = transaction.objectStore(OFFLINE_SESSION_RESULTS_STORE);
    
    // Find all sessions that are completed but not synced
    const unSyncedSessions = await new Promise<OfflineSession[]>((resolve, reject) => {
        const isSyncedIndex = sessionStore.index('isSynced');
        const request = isSyncedIndex.getAll(IDBKeyRange.only('false')); // Note: isSynced is boolean, but IndexedDB might store it differently. This should work.
        request.onsuccess = () => resolve(request.result.filter(s => s.isCompleted));
        request.onerror = () => reject('Could not query unsynced sessions.');
    });

    if (unSyncedSessions.length === 0) {
        return [];
    }

    // Get all results and then map them to their sessions
    const allResults = await new Promise<CardResult[]>((resolve, reject) => {
        const request = resultsStore.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Could not get all session results.');
    });

    const resultsMap = new Map<string, CardResult[]>();
    for (const result of allResults) {
        if (!resultsMap.has(result.sessionId)) {
            resultsMap.set(result.sessionId, []);
        }
        resultsMap.get(result.sessionId)!.push(result);
    }
    
    return unSyncedSessions.map(session => ({
        ...session,
        results: resultsMap.get(session.sessionId) || []
    }));
}


// --- REFACTORED & DEPRECATED FUNCTIONS ---

/**
 * Saves a single card result to IndexedDB.
 * This now saves to the new 'offlineSessionResults' store.
 * @param result The card result to save.
 */
export async function saveResult(result: CardResult): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OFFLINE_SESSION_RESULTS_STORE, 'readwrite');
    const store = transaction.objectStore(OFFLINE_SESSION_RESULTS_STORE);
    const request = store.add(result);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error saving result to IndexedDB', { error: request.error });
      reject('Could not save result.');
    };
  });
}

/**
 * @deprecated Use getUnsyncedSessions() instead. This function will be removed in a future version.
 */
export async function getQueuedSessions(): Promise<string[]> {
    Logger.warning(LogContext.SYSTEM, 'getQueuedSessions() is deprecated.');
    return [];
}

/**
 * @deprecated Use markSessionAsSynced() instead. This function will be removed in a future version.
 */
export async function removeSessionFromQueue(sessionId: string): Promise<void> {
    Logger.warning(LogContext.SYSTEM, 'removeSessionFromQueue() is deprecated.', { sessionId });
}

/**
 * @deprecated This function is no longer needed as results are cleared after successful sync.
 */
export async function clearResults(sessionId: string): Promise<void> {
    Logger.warning(LogContext.SYSTEM, 'clearResults() is deprecated.', { sessionId });
}
