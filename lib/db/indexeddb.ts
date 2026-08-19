/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Logger, LogContext } from '@/lib/logging/client-logger';
const DB_NAME = 'FlashlearnAI';
const DB_VERSION = 6; // Incremented to drop the three stores nothing wrote to
const STUDY_RESULTS_STORE = 'studyResults';
const SYNC_QUEUE_STORE = 'syncQueue';
const STUDY_HISTORY_STORE = 'studyHistory';
const PENDING_CHANGES_STORE = 'pendingChanges';

/**
 * Stores that shipped in versions 1 through 5 and were never populated:
 * `offlineSets` and `categories` had no writer that any screen reached, and
 * `conflictQueue` could only fill on an HTTP 409 that no route ever returns.
 * Version 6 drops them so an existing browser reclaims the space instead of
 * carrying empty stores forever.
 */
const RETIRED_STORES = ['offlineSets', 'categories', 'conflictQueue'];

// Existing interfaces
export interface CardResult {
  sessionId: string;
  setId?: string;
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
  studyDirection: string;
  studyMode?: string;
  /**
   * The learner the results belong to, when a teacher ran the session for
   * someone else. Absent on ordinary self-study, which is every record written
   * before proctoring shipped, so reads of older rows are unaffected.
   */
  subjectId?: string;
  proctorMode?: 'proctored' | 'handoff';
}

export interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'set' | 'category' | 'flashcard';
  data: any; // Keep as any for flexibility with different update types
  timestamp: Date;
  retryCount: number;
}

let db: IDBDatabase;

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

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      
      // Existing stores
      if (!dbInstance.objectStoreNames.contains(STUDY_RESULTS_STORE)) {
        dbInstance.createObjectStore(STUDY_RESULTS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
      
      if (!dbInstance.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        dbInstance.createObjectStore(SYNC_QUEUE_STORE, {
          keyPath: 'sessionId',
        });
      }

      if (!dbInstance.objectStoreNames.contains(STUDY_HISTORY_STORE)) {
        dbInstance.createObjectStore(STUDY_HISTORY_STORE, {
          keyPath: 'sessionId',
        });
      }

      if (!dbInstance.objectStoreNames.contains(PENDING_CHANGES_STORE)) {
        dbInstance.createObjectStore(PENDING_CHANGES_STORE, {
          keyPath: 'id',
        });
      }

      // Drop the stores retired in version 6. Guarded by `contains` so a first
      // run, where none of them were ever created, is a no-op rather than a
      // NotFoundError.
      for (const name of RETIRED_STORES) {
        if (dbInstance.objectStoreNames.contains(name)) {
          dbInstance.deleteObjectStore(name);
        }
      }
    };
  });
}

// Existing functions (unchanged)
export async function saveResult(result: CardResult): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STUDY_RESULTS_STORE, 'readwrite');
    const store = tx.objectStore(STUDY_RESULTS_STORE);
    const request = store.add(result);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error saving result to IndexedDB', { error: request.error });
      reject('Could not save result.');
    };
  });
}

export async function getResults(sessionId: string): Promise<CardResult[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STUDY_RESULTS_STORE, 'readonly');
    const store = tx.objectStore(STUDY_RESULTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const allResults = request.result as StoredResult[];
      resolve(allResults.filter(r => r.sessionId === sessionId));
    };

    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error getting results from IndexedDB', { error: request.error });
      reject('Could not get results.');
    };
  });
}

export async function clearResults(sessionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STUDY_RESULTS_STORE, 'readwrite');
    const store = tx.objectStore(STUDY_RESULTS_STORE);
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

export async function queueSessionForSync(sessionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    const request = store.add({ sessionId });

    request.onsuccess = () => {
      Logger.log(LogContext.SYSTEM, 'Session queued for sync', { sessionId });
      resolve();
    };
    request.onerror = () => {
      // Handle duplicate key error gracefully
      if (request.error?.name === 'ConstraintError') {
        Logger.log(LogContext.SYSTEM, 'Session already in sync queue', { sessionId });
        return resolve();
      }
      Logger.error(LogContext.SYSTEM, 'Error queuing session for sync', { error: request.error });
      reject('Could not queue session.');
    };
  });
}

export async function getQueuedSessions(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
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

export async function removeSessionFromQueue(sessionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
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

// NEW: Study History Management
export async function saveStudyHistory(session: StudySessionHistory): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STUDY_HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(STUDY_HISTORY_STORE);
    const request = store.put(session);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error saving study history', { error: request.error });
      reject('Could not save study history.');
    };
  });
}

export async function getStudyHistory(limit: number = 10): Promise<StudySessionHistory[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STUDY_HISTORY_STORE, 'readonly');
    const store = tx.objectStore(STUDY_HISTORY_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as StudySessionHistory[];
      // Sort by start time descending and limit
      const sorted = results
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, limit);
      resolve(sorted);
    };
    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error getting study history', { error: request.error });
      reject('Could not get study history.');
    };
  });
}

export async function getStudyHistoryBySessionId(sessionId: string): Promise<StudySessionHistory | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STUDY_HISTORY_STORE, 'readonly');
    const store = tx.objectStore(STUDY_HISTORY_STORE);
    const request = store.get(sessionId);

    request.onsuccess = () => {
      resolve(request.result as StudySessionHistory | null);
    };
    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error getting study history by sessionId', { error: request.error });
      reject('Could not get study history entry.');
    };
  });
}

// NEW: Pending Changes Management
export async function savePendingChange(change: PendingChange): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_CHANGES_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_CHANGES_STORE);
    const request = store.put(change);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error saving pending change', { error: request.error });
      reject('Could not save pending change.');
    };
  });
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_CHANGES_STORE, 'readonly');
    const store = tx.objectStore(PENDING_CHANGES_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error getting pending changes', { error: request.error });
      reject('Could not get pending changes.');
    };
  });
}

export async function removePendingChange(changeId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_CHANGES_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_CHANGES_STORE);
    const request = store.delete(changeId);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      Logger.error(LogContext.SYSTEM, 'Error removing pending change', { error: request.error });
      reject('Could not remove pending change.');
    };
  });
}
