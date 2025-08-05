# Implementation Plan: Refactoring for Enhanced Offline Mode

**Version:** 2.1
**Date:** August 5, 2025
**Status:** Proposed

## 1. Introduction

This document provides a refactoring plan to upgrade the existing offline implementation to a more robust, full-featured offline mode. The goal is to build upon the current codebase to allow users to download entire decks, manage multiple study sessions offline, and sync all progress seamlessly.

---

## 2. Phase 1: Overhaul IndexedDB and Data Models

**Goal:** Evolve the IndexedDB schema to store entire decks and track discrete offline sessions, not just their results.

**File to Refactor:** `lib/db/indexeddb.ts`

### 2.1. Upgrade IndexedDB Schema (Version 3)

1.  **Increment DB_VERSION:** Change `const DB_VERSION = 2;` to `const DB_VERSION = 3;`.
2.  **Add New Object Stores:** In the `request.onupgradeneeded` event handler, add the following new object stores:
    * **`offlineDecks`**: To store full flashcard sets.
        ```typescript
        if (!dbInstance.objectStoreNames.contains('offlineDecks')) {
          dbInstance.createObjectStore('offlineDecks', { keyPath: 'setId' });
        }
        ```
    * **`offlineSessions`**: To track metadata for each offline session.
        ```typescript
        if (!dbInstance.objectStoreNames.contains('offlineSessions')) {
          const sessionStore = dbInstance.createObjectStore('offlineSessions', { keyPath: 'sessionId' });
          sessionStore.createIndex('isSynced', 'isSynced', { unique: false });
        }
        ```
3.  **Rename for Clarity (Optional but Recommended):**
    * Rename `studyResults` to `offlineSessionResults`.
    * Rename `syncQueue` to `syncQueue_DEPRECATED` as `offlineSessions` will now manage the queue.

### 2.2. Implement New Data Management Functions

Create the following new functions within `lib/db/indexeddb.ts`:

* **`downloadDeck(deck: { setId: string; title: string; flashcards: any[] }): Promise<void>`**: Saves a full deck to the `offlineDecks` store.
* **`getOfflineDeck(setId: string): Promise<Deck | null>`**: Retrieves a single deck from `offlineDecks`.
* **`isDeckOffline(setId: string): Promise<boolean>`**: Checks if a deck exists in `offlineDecks`.
* **`createOfflineSession(setId: string): Promise<string>`**: Creates a new record in `offlineSessions` with `isCompleted: false` and `isSynced: false`, returning the new `sessionId`.
* **`completeOfflineSession(sessionId: string): Promise<void>`**: Updates a session in `offlineSessions` to set `isCompleted: true` and `endTime`.
* **`getUnsyncedSessions(): Promise<any[]>`**: This is the most critical new function. It will:
    1.  Query `offlineSessions` for all records where `isCompleted: true` and `isSynced: false`.
    2.  For each session found, query `offlineSessionResults` to get all associated card results.
    3.  Return an array of complete session objects, each containing its metadata and its array of results.
* **`markSessionAsSynced(sessionId: string): Promise<void>`**: Updates a session in `offlineSessions` to set `isSynced: true`.

### 2.3. Refactor Existing Functions

* Modify `saveResult` to save to the `offlineSessionResults` store.
* Deprecate `getQueuedSessions` and `removeSessionFromQueue`. The new `getUnsyncedSessions` and `markSessionAsSynced` provide a more robust replacement.

---

## 3. Phase 2: UI and Component Refactoring

**Goal:** Integrate the new data capabilities into the user interface.

### 3.1. Create a Deck List Item Component

**New File:** `components/decks/DeckListItem.tsx` (or similar)

* This component will represent a single flashcard set in a list.
* It must include a **"Download" button**.
* **Logic:**
    * On render, it will use the `isDeckOffline(setId)` function to check if the deck is already saved locally.
    * If `true`, the button should be disabled and show "Downloaded" or an icon.
    * On click, it will fetch the full deck data from the API and then call `downloadDeck()` to save it to IndexedDB.

### 3.2. Refactor `StudySession.tsx`

This component requires significant changes to its logic.

* **Starting a Session:**
    * When the "Start Session" button is clicked, check `isOnline` from the `useSync` hook.
    * **If Offline:**
        1.  Use `getOfflineDeck(setId)` to retrieve the flashcards. If it returns null, show an error: "This deck must be downloaded to study offline."
        2.  Call `createOfflineSession(setId)` to get a new `sessionId`.
        3.  **Randomize the flashcards array locally** before setting it in the state.
        4.  Proceed with the study session.
    * **If Online:** The existing flow of creating a session via the API can remain.
* **Recording Results:** The `recordCardResult` function should be updated to use the new `saveResult` that points to `offlineSessionResults`.
* **Completing a Session:** The `completeSession` function should be simplified:
    * If the session was initiated offline, it should only call `completeOfflineSession(sessionId)`. The `syncService` will handle the upload later.
    * If the session was online, it can proceed with a direct API call as it does now.

### 3.3. Update `MainLayout.tsx`

* Integrate the `useSync` hook at this top level.
* Render a persistent, non-intrusive banner or indicator when `isOnline` is `false`.
    ```jsx
    // In MainLayout.tsx
    const { isOnline } = useSync();

    // In the return JSX
    {!isOnline && (
      <div className="bg-yellow-500 text-white text-center p-2 fixed bottom-0 w-full z-50">
        You are currently offline. Progress will be synced when you reconnect.
      </div>
    )}
    ```

---

## 4. Phase 3: Service and API Refactoring

**Goal:** Update the backend and sync services to handle the new data structures.

### 4.1. Refactor `syncService.ts`

* Modify `syncOfflineData()` to use the new `getUnsyncedSessions()` function.
* The `fetch` request should now `POST` to `/api/study/sessions` with a body containing the array of complete session objects: `{ sessions: [...] }`.
* On a successful API response, iterate through the successfully synced sessions and call `markSessionAsSynced(sessionId)` for each one.

### 4.2. Refactor API Route (`app/api/study/sessions/route.ts`)

* The `POST` handler needs to be updated to handle the new batch payload.
* It should expect a body of `{ sessions: SessionWithResults[] }`.
* The handler should loop through the `sessions` array.
* The existing transaction logic for processing results is excellent and should be applied to each session within the loop.
* If any session in the batch fails, the entire request should fail so the client can retry later. Return a detailed error if possible.
* On complete success, return a `200 OK` status.


