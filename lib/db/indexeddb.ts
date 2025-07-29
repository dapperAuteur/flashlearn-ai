'use client';

const DB_NAME = 'FlashlearnAI';
const DB_VERSION = 1;
const STORE_NAME = 'studyResults';

// Define the structure of a single card result
export interface CardResult {
  sessionId: string;
  flashcardId: string;
  isCorrect: boolean;
  timeSeconds: number;
}

// Define the structure of the object in the IndexedDB store
interface StoredResult extends CardResult {
  id?: number; // auto-incrementing primary key
}

let db: IDBDatabase;

/**
 * Opens and initializes the IndexedDB database.
 * @returns A promise that resolves with the database instance.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // If the database connection is already open, resolve immediately.
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject('Error opening IndexedDB');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    // This event runs only when the DB version changes, for initial setup or schema updates.
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        // Create the object store with an auto-incrementing primary key.
        dbInstance.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
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
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(result);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Error saving result to IndexedDB:', request.error);
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
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Filter the results in-memory for the correct session
      const allResults = request.result as StoredResult[];
      resolve(allResults.filter(r => r.sessionId === sessionId));
    };

    request.onerror = () => {
      console.error('Error getting results from IndexedDB:', request.error);
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
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Iterate through all results and delete those matching the session ID
      const allResults = request.result as StoredResult[];
      for (const result of allResults) {
        if (result.sessionId === sessionId) {
          store.delete(result.id!);
        }
      }
      resolve();
    };

    request.onerror = () => {
      console.error('Error clearing results from IndexedDB:', request.error);
      reject('Could not clear results.');
    };
  });
}
