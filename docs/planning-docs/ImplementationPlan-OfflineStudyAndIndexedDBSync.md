## **Implementation Plan: Offline Study & IndexedDB Sync**

# This plan details the steps required to enable a full offline-first study experience, ensuring user progress is never lost and is synced to the server when a connection is available.

### **Phase 1: Enhance the IndexedDB Service**

# The current indexeddb.ts is good, but it needs a "sync queue" to be truly robust. We will modify it to track which data needs to be sent to the server.**File to Modify:** lib/db/indexeddb.ts**1. Create a "Sync Queue" Object Store:*** We need a new table (object store) in IndexedDB to keep a record of completed study sessions that are pending synchronization.

* **Action:** In the onupgradeneeded function, add a new object store called syncQueue.**2. Add a Function to Queue a Session for Syncing:*** When a study session is completed offline, we'll add its sessionId to this new syncQueue.

* **Action:** Create a new exported function queueSessionForSync(sessionId: string).**3. Add a Function to Get and Clear the Sync Queue:*** We need a way to retrieve all the session IDs that are waiting to be synced.

* **Action:** Create getQueuedSessions(): Promise\<string\[]> and removeSessionFromQueue(sessionId: string).

### **Phase 2: Implement the Synchronization Logic**

This is the core of the offline functionality. We'll create a new service that handles checking for an internet connection and processing the sync queue.**New File:** lib/services/syncService.ts**1. Create the syncOfflineData Function:*** This will be the main function in the service. It will:\
  a. Call getQueuedSessions() from our IndexedDB service.\
  b. For each sessionId in the queue:\
  i. Call getResults(sessionId) to get all the saved card results.\
  ii. Make a POST request to the /api/study-sessions endpoint with the results.\
  iii. If the API call is successful, call clearResults(sessionId) and removeSessionFromQueue(sessionId).\
  iv. If the API call fails, leave the data in IndexedDB to be retried later.**2. Create a Global useSync Hook:*** This React hook will manage the online/offline state of the application and trigger the sync process.

* **New File:** hooks/useSync.ts

* Functionality:\
  a. Use the navigator.onLine property to detect the connection status.\
  b. Add event listeners for online and offline events to update the state.\
  c. When the status changes from offline to online, automatically call syncOfflineData().
==========================================================================================

### **Phase 3: Integrate Syncing into the UI**

Now we'll update the components to use our new sync service and provide feedback to the user.**1. Update the Main Layout:*** **File to Modify:** components/dashboard/MainLayout.tsx

* Action:\
  a. Call the useSync hook to get the current online status.\
  b. Display a persistent, non-intrusive UI element (like a banner or a small icon) when the user is offline. This provides clear feedback.\
  c. When the app comes back online, you can use the useToast hook to show a brief, celebratory message like "You're back online! Syncing your progress."**2. Update the Study Session Component:*** **File to Modify:** components/study/StudySession.tsx

* Action:\
  a. In the completeSession function, check the online status from the useSync hook.\
  b. If online: Proceed with the API call as it does now.\
  c. If offline:\
  i. Skip the fetch call entirely.\
  ii. Call queueSessionForSync(sessionId).\
  iii. Log to the console that the session is queued for later.\
  iv. Set the session to isComplete so the user can see their results locally.
==============================================================================

### **Phase 4: Update the Backend API**

# The API needs to be able to handle a batch of results for a session.**File to Modify:** app/api/study/sessions/route.ts (or a more specific route like app/api/study/sessions/\[sessionId]/route.ts)**1. Modify the POST Handler:*** Ensure the endpoint can accept an array of CardResult objects in the request body.

* The handler should loop through the array and save each result to the main database (e.g., MongoDB).

* It should be wrapped in a transaction to ensure that either all results are saved or none are.By following this plan, you will create a seamless and robust offline experience. Users can study with confidence, knowing their hard work will be saved and synced automatically.
