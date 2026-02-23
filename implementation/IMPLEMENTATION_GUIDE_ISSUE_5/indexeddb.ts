// lib/db/indexeddb.ts
import { Logger, LogContext } from '@/lib/logging/client-logger';

const DB_NAME = 'FlashcardAppDB';
const DB_VERSION = 5;
const STUDY_RESULTS_STORE = 'studyResults';
const SYNC_QUEUE_STORE = 'syncQueue';
const OFFLINE_SETS_STORE = 'offlineSets';
const CATEGORIES_STORE = 'categories';
const STUDY_HISTORY_STORE = 'studyHistory';
const PENDING_CHANGES_STORE = 'pendingChanges';

export interface CardResult {
  sessionId: string;
  flashcardId: string;
  isCorrect: boolean;
  timeSeconds: number;
  confidenceRating?: number;
}

interface StoredResult extends CardResult {
  id?: number;
}

interface QueuedSession {
  sessionId: string;
}

export interface OfflineFlashcardSet {
  setId: string;
  title: string;
  description?: string;
  userId: string;
  isPublic: boolean;
  categories: string[];
  tags: string[];
  flashcards: Array<{
    _id: string;
    front: string;
    back: string;
    frontImage?: string;
    backImage?: string;
  }>;
  lastSynced: Date;
  isOfflineEnabled: boolean;
  cardCount: number;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
}

export interface StudySessionHistory {
  sessionId: string;
  setId: string;
  setName: string;
  startTime: Date;
  endTime?: Date;
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  durationSeconds: number;
  isOfflineSession: boolean;
}

export interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'set' | 'category' | 'flashcard';
  data: any;
  timestamp: Date;
  retryCount: number;
}

let db: IDBDatabase;

/**
 * Opens IndexedDB connection with proper error handling
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      const error = request.error?.message || 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'IndexedDB error', { error });
      reject(new Error(`Error opening IndexedDB: ${error}`));
    };

    request.onsuccess = () => {
      db = request.result;
      Logger.log(LogContext.SYSTEM, 'IndexedDB opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      
      Logger.log(LogContext.SYSTEM, 'Upgrading IndexedDB', { 
        oldVersion: event.oldVersion,
        newVersion: event.newVersion 
      });
      
      // Study results store
      if (!dbInstance.objectStoreNames.contains(STUDY_RESULTS_STORE)) {
        dbInstance.createObjectStore(STUDY_RESULTS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
      
      // Sync queue store
      if (!dbInstance.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        dbInstance.createObjectStore(SYNC_QUEUE_STORE, {
          keyPath: 'sessionId',
        });
      }

      // Offline sets store
      if (!dbInstance.objectStoreNames.contains(OFFLINE_SETS_STORE)) {
        dbInstance.createObjectStore(OFFLINE_SETS_STORE, {
          keyPath: 'setId',
        });
      }

      // Categories store
      if (!dbInstance.objectStoreNames.contains(CATEGORIES_STORE)) {
        dbInstance.createObjectStore(CATEGORIES_STORE, {
          keyPath: 'id',
        });
      }

      // Study history store
      if (!dbInstance.objectStoreNames.contains(STUDY_HISTORY_STORE)) {
        dbInstance.createObjectStore(STUDY_HISTORY_STORE, {
          keyPath: 'sessionId',
        });
      }

      // Pending changes store
      if (!dbInstance.objectStoreNames.contains(PENDING_CHANGES_STORE)) {
        dbInstance.createObjectStore(PENDING_CHANGES_STORE, {
          keyPath: 'id',
        });
      }
    };
  });
}

// ============================================================================
// STUDY RESULTS OPERATIONS
// ============================================================================

/**
 * Save a card result to IndexedDB
 * Returns a promise that resolves when save is complete
 */
export async function saveResult(result: CardResult): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STUDY_RESULTS_STORE, 'readwrite');
      const store = transaction.objectStore(STUDY_RESULTS_STORE);
      const request = store.add(result);

      request.onsuccess = () => {
        Logger.log(LogContext.STUDY, 'Result saved to IndexedDB', { 
          sessionId: result.sessionId,
          flashcardId: result.flashcardId 
        });
        resolve();
      };

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error saving result to IndexedDB', { 
          error,
          sessionId: result.sessionId 
        });
        reject(new Error(`Could not save result: ${error}`));
      };

      transaction.oncomplete = () => {
        Logger.log(LogContext.STUDY, 'Save transaction completed', { 
          sessionId: result.sessionId 
        });
      };

      transaction.onerror = () => {
        const error = transaction.error?.message || 'Transaction error';
        Logger.error(LogContext.SYSTEM, 'Transaction error saving result', { error });
        reject(new Error(`Transaction failed: ${error}`));
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception saving result', { error: errorMessage });
      reject(new Error(`Failed to save result: ${errorMessage}`));
    }
  });
}

/**
 * Get all results for a specific session
 */
export async function getResults(sessionId: string): Promise<CardResult[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STUDY_RESULTS_STORE, 'readonly');
      const store = transaction.objectStore(STUDY_RESULTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const allResults = request.result as StoredResult[];
        const filtered = allResults.filter(r => r.sessionId === sessionId);
        
        Logger.log(LogContext.STUDY, 'Results retrieved from IndexedDB', { 
          sessionId,
          count: filtered.length 
        });
        
        resolve(filtered);
      };

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error getting results from IndexedDB', { 
          error,
          sessionId 
        });
        reject(new Error(`Could not get results: ${error}`));
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception getting results', { error: errorMessage });
      reject(new Error(`Failed to get results: ${errorMessage}`));
    }
  });
}

/**
 * Clear all results for a specific session
 */
export async function clearResults(sessionId: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STUDY_RESULTS_STORE, 'readwrite');
      const store = transaction.objectStore(STUDY_RESULTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const allResults = request.result as StoredResult[];
        let deletedCount = 0;
        
        for (const result of allResults) {
          if (result.sessionId === sessionId && result.id) {
            store.delete(result.id);
            deletedCount++;
          }
        }
        
        Logger.log(LogContext.STUDY, 'Results cleared from IndexedDB', { 
          sessionId,
          deletedCount 
        });
      };

      transaction.oncomplete = () => {
        resolve();
      };

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error clearing results from IndexedDB', { 
          error,
          sessionId 
        });
        reject(new Error(`Could not clear results: ${error}`));
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception clearing results', { error: errorMessage });
      reject(new Error(`Failed to clear results: ${errorMessage}`));
    }
  });
}

// ============================================================================
// SYNC QUEUE OPERATIONS
// ============================================================================

/**
 * Add a session to the sync queue
 */
export async function queueSessionForSync(sessionId: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const request = store.add({ sessionId });

      request.onsuccess = () => {
        Logger.log(LogContext.STUDY, 'Session queued for sync', { sessionId });
        resolve();
      };

      request.onerror = () => {
        // Handle duplicate key error gracefully
        if (request.error?.name === 'ConstraintError') {
          Logger.log(LogContext.STUDY, 'Session already in sync queue', { sessionId });
          return resolve();
        }
        
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error queuing session for sync', { 
          error,
          sessionId 
        });
        reject(new Error(`Could not queue session: ${error}`));
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception queuing session', { error: errorMessage });
      reject(new Error(`Failed to queue session: ${errorMessage}`));
    }
  });
}

/**
 * Get all sessions in the sync queue
 */
export async function getQueuedSessions(): Promise<string[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(SYNC_QUEUE_STORE, 'readonly');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const queuedItems = request.result as QueuedSession[];
        const sessionIds = queuedItems.map(item => item.sessionId);
        
        Logger.log(LogContext.STUDY, 'Retrieved queued sessions', { 
          count: sessionIds.length 
        });
        
        resolve(sessionIds);
      };

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error getting queued sessions', { error });
        reject(new Error(`Could not get queued sessions: ${error}`));
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception getting queued sessions', { error: errorMessage });
      reject(new Error(`Failed to get queued sessions: ${errorMessage}`));
    }
  });
}

/**
 * Remove a session from the sync queue
 */
export async function removeSessionFromQueue(sessionId: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const request = store.delete(sessionId);

      request.onsuccess = () => {
        Logger.log(LogContext.STUDY, 'Session removed from sync queue', { sessionId });
        resolve();
      };

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error removing session from sync queue', { 
          error,
          sessionId 
        });
        reject(new Error(`Could not remove session from queue: ${error}`));
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception removing session from queue', { error: errorMessage });
      reject(new Error(`Failed to remove session from queue: ${errorMessage}`));
    }
  });
}

// ============================================================================
// STUDY HISTORY OPERATIONS
// ============================================================================

/**
 * Save study session history
 */
export async function saveStudyHistory(session: StudySessionHistory): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STUDY_HISTORY_STORE, 'readwrite');
      const store = transaction.objectStore(STUDY_HISTORY_STORE);
      const request = store.put(session);

      request.onsuccess = () => {
        Logger.log(LogContext.STUDY, 'Study history saved', { 
          sessionId: session.sessionId 
        });
        resolve();
      };

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error saving study history', { 
          error,
          sessionId: session.sessionId 
        });
        reject(new Error(`Could not save study history: ${error}`));
      };

      transaction.oncomplete = () => {
        Logger.log(LogContext.STUDY, 'Study history transaction completed', { 
          sessionId: session.sessionId 
        });
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception saving study history', { error: errorMessage });
      reject(new Error(`Failed to save study history: ${errorMessage}`));
    }
  });
}

/**
 * Get study history (most recent first)
 */
export async function getStudyHistory(limit: number = 10): Promise<StudySessionHistory[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STUDY_HISTORY_STORE, 'readonly');
      const store = transaction.objectStore(STUDY_HISTORY_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const allHistory = request.result as StudySessionHistory[];
        
        // Sort by start time (most recent first)
        const sorted = allHistory.sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        
        const limited = sorted.slice(0, limit);
        
        Logger.log(LogContext.STUDY, 'Study history retrieved', { 
          totalCount: allHistory.length,
          returnedCount: limited.length 
        });
        
        resolve(limited);
      };

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error getting study history', { error });
        reject(new Error(`Could not get study history: ${error}`));
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception getting study history', { error: errorMessage });
      reject(new Error(`Failed to get study history: ${errorMessage}`));
    }
  });
}

// ============================================================================
// OFFLINE SETS OPERATIONS
// ============================================================================

export async function saveOfflineSet(set: OfflineFlashcardSet): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(OFFLINE_SETS_STORE, 'readwrite');
      const store = transaction.objectStore(OFFLINE_SETS_STORE);
      const request = store.put(set);

      request.onsuccess = () => {
        Logger.log(LogContext.SYSTEM, 'Offline set saved', { setId: set.setId });
        resolve();
      };

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error saving offline set', { error });
        reject(new Error(`Could not save offline set: ${error}`));
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception saving offline set', { error: errorMessage });
      reject(new Error(`Failed to save offline set: ${errorMessage}`));
    }
  });
}

export async function getOfflineSets(): Promise<OfflineFlashcardSet[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(OFFLINE_SETS_STORE, 'readonly');
      const store = transaction.objectStore(OFFLINE_SETS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        Logger.log(LogContext.SYSTEM, 'Offline sets retrieved', { 
          count: request.result.length 
        });
        resolve(request.result);
      };

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error getting offline sets', { error });
        reject(new Error(`Could not get offline sets: ${error}`));
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception getting offline sets', { error: errorMessage });
      reject(new Error(`Failed to get offline sets: ${errorMessage}`));
    }
  });
}

export async function getOfflineSet(setId: string): Promise<OfflineFlashcardSet | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(OFFLINE_SETS_STORE, 'readonly');
      const store = transaction.objectStore(OFFLINE_SETS_STORE);
      const request = store.get(setId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error getting offline set', { error, setId });
        reject(new Error(`Could not get offline set: ${error}`));
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception getting offline set', { error: errorMessage });
      reject(new Error(`Failed to get offline set: ${errorMessage}`));
    }
  });
}

export async function deleteOfflineSet(setId: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(OFFLINE_SETS_STORE, 'readwrite');
      const store = transaction.objectStore(OFFLINE_SETS_STORE);
      const request = store.delete(setId);

      request.onsuccess = () => {
        Logger.log(LogContext.SYSTEM, 'Offline set deleted', { setId });
        resolve();
      };

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        Logger.error(LogContext.SYSTEM, 'Error deleting offline set', { error, setId });
        reject(new Error(`Could not delete offline set: ${error}`));
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogContext.SYSTEM, 'Exception deleting offline set', { error: errorMessage });
      reject(new Error(`Failed to delete offline set: ${errorMessage}`));
    }
  });
}
