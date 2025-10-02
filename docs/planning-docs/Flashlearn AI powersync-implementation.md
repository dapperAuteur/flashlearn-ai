# PowerSync Implementation Checklist - FlashLearn AI

## Overview
This checklist covers the complete implementation of PowerSync for offline-first sync in FlashLearn AI. Follow phases in order. Each phase builds on the previous one.

---

## Phase 1: PowerSync Foundation (Week 1-2)

### Setup & Installation

- [x] Install PowerSync packages
  ```bash
  npm install @powersync/web @powersync/react
  ```

- [x] Verify all environment variables are set
  - [x] `MONGODB_URI`
  - [x] `NEXTAUTH_SECRET`
  - [x] `NEXTAUTH_URL`

### Define PowerSync Schema

- [x] Create `lib/powersync/schema.ts`
  - [x] Define `flashcard_sets` table
    - [x] `id` (MongoDB _id)
    - [x] `user_id`
    - [x] `title`
    - [x] `description`
    - [x] `is_public`
    - [x] `card_count`
    - [x] `source` (CSV, PDF, etc.)
    - [x] `created_at`
    - [x] `updated_at`
    - [x] `is_deleted` (soft delete flag)
  - [x] Define `flashcards` table (flattened from nested array)
    - [x] `id` (MongoDB _id of card)
    - [x] `set_id` (reference to parent set)
    - [x] `user_id` (denormalized for queries)
    - [x] `front`
    - [x] `back`
    - [x] `front_image`
    - [x] `back_image`
    - [x] `created_at`
    - [x] `updated_at`
  - [x] Define `offline_sets` table (tracks which sets user wants offline)
    - [x] `id`
    - [x] `user_id`
    - [x] `set_id`
    - [x] `is_owned` (boolean - true if user owns, false if public/shared)
    - [x] `last_accessed`
    - [x] `created_at`
  - [x] Define `categories` table
    - [x] `id`
    - [x] `user_id`
    - [x] `name`
    - [x] `color`
    - [x] `created_at`
  - [x] Add indexes for common queries
    - [x] `user_sets`: user_id + is_deleted
    - [x] `set_cards`: set_id
    - [x] `offline_sets`: user_id + last_accessed

- [x] Export TypeScript types from schema

### Create PowerSync Client

- [x] Create `lib/powersync/client.ts`
  - [x] Implement `initPowerSync()` function
    - [x] Configure schema
    - [x] Set database filename: `flashlearnai.db` (IndexedDB)
    - [x] Add development logging
  - [x] Implement `getPowerSync()` singleton getter
  - [x] Add error handling for uninitialized access

### Create Backend Sync Endpoint

- [ ] Create `app/api/powersync/route.ts`
  - [ ] Implement POST handler with authentication
    - [ ] Use `getServerSession(authOptions)`
    - [ ] Return 401 if not authenticated
  - [ ] Implement `handlePull(db, userId, params)` function
    - [ ] Query flashcard_sets for user
    - [ ] Query categories for user
    - [ ] Query offline_sets for user
    - [ ] **Transform nested flashcards to flat structure**
      ```typescript
      // MongoDB structure:
      { _id, title, flashcards: [{_id, front, back}] }
      
      // PowerSync receives:
      Set: { id, title, card_count }
      Card 1: { id, set_id, front, back }
      Card 2: { id, set_id, front, back }
      ```
    - [ ] Filter by `updated_at` > `last_synced_at`
    - [ ] Return checkpoint timestamp
  - [ ] Implement `handlePush(db, userId, changes)` function
    - [ ] Process flashcard_sets changes
    - [ ] Process flashcards changes
    - [ ] **Reconstruct nested structure for MongoDB**
      ```typescript
      // PowerSync sends flat cards
      // MongoDB needs: { flashcards: [...] }
      ```
    - [ ] Process categories changes
    - [ ] Process offline_sets changes
    - [ ] Use upsert for all operations
    - [ ] Set `updated_at` timestamp
  - [ ] Implement helper functions
    - [ ] `convertMongoToSync(doc)` - _id to id conversion
    - [ ] `flattenFlashcardSet(set)` - nested to flat
    - [ ] `reconstructFlashcardSet(cards)` - flat to nested

### Create FlashcardContext

- [ ] Create `contexts/FlashcardContext.tsx`
  - [ ] Import PowerSync hooks (`usePowerSync`, `useQuery`)
  - [ ] Define FlashcardContextType interface
    - [ ] Data: `flashcardSets`, `offlineSets`, `categories`
    - [ ] Status: `isSyncing`, `isOnline`, `lastSyncTime`
    - [ ] Actions: CRUD operations
  - [ ] Implement provider component
    - [ ] Use `useSession()` for authentication
    - [ ] Use `useQuery()` for each table
      - [ ] Query flashcard_sets WHERE `user_id = ? AND is_deleted = 0`
      - [ ] Query offline_sets WHERE `user_id = ?`
      - [ ] Query categories WHERE `user_id = ?`
    - [ ] Monitor online/offline status
      - [ ] Add event listeners for `online`/`offline`
      - [ ] Update `isOnline` state
    - [ ] Connect PowerSync on authentication
      - [ ] Only connect if `session?.user?.id` exists
      - [ ] Set sync endpoint to `/api/powersync`
      - [ ] Handle connection errors gracefully
      - [ ] Disconnect on unmount
  - [ ] Implement CRUD operations
    - [ ] `createFlashcardSet(set)` - INSERT with MongoDB-compatible ID
    - [ ] `updateFlashcardSet(id, updates)` - UPDATE with timestamp
    - [ ] `deleteFlashcardSet(id)` - Soft delete (is_deleted = 1)
    - [ ] `toggleOfflineAvailability(setId)` - Check 10-set limit
    - [ ] `createCategory(category)` - INSERT
    - [ ] `updateCategory(id, updates)` - UPDATE
    - [ ] `deleteCategory(id)` - DELETE
  - [ ] Implement MongoDB-compatible ID generator
    - [ ] 24-character hex string format
    - [ ] Include timestamp (8 chars) + random (16 chars)

- [ ] Create custom hook `useFlashcards()` 
  - [ ] Return context with error if used outside provider
  - [ ] Export hook

### Update App Layout

- [ ] Modify `app/layout.tsx` (or dashboard layout)
  - [ ] Import PowerSync components
    - [ ] `PowerSyncProvider` from `@powersync/react`
    - [ ] `initPowerSync` from `lib/powersync/client`
  - [ ] Initialize PowerSync before render
    - [ ] Call `await initPowerSync()` in server component
  - [ ] Wrap app with providers in correct order
    ```tsx
    <SessionProvider>
      <PowerSyncProvider database={powerSync}>
        <FlashcardProvider>
          {/* existing providers */}
        </FlashcardProvider>
      </PowerSyncProvider>
    </SessionProvider>
    ```

### Update FlashcardManager Component

- [ ] Modify `components/flashcards/FlashcardManager.tsx`
  - [ ] Replace IndexedDB imports with FlashcardContext
    - [ ] Remove `getOfflineSets`, `saveOfflineSet`, etc.
    - [ ] Add `useFlashcards()` hook
  - [ ] Update state management
    - [ ] Remove local `sets` state (use context)
    - [ ] Remove local `offlineSets` state (use context)
    - [ ] Keep UI state (search, filters, modals)
  - [ ] Update `toggleOffline` function
    - [ ] Check if user is at 10-set limit
    - [ ] Show modal if limit reached
      - [ ] List current offline sets
      - [ ] Allow user to select which to remove
    - [ ] Call `context.toggleOfflineAvailability(setId)`
  - [ ] Add sync status indicators
    - [ ] Show sync icon next to each set
    - [ ] Display "Syncing...", "Synced ✓", or "Local only"
  - [ ] Update offline set counter UI
    - [ ] Show "X of 10 sets available offline"
    - [ ] Update in real-time as user toggles
  - [ ] Handle share button state
    - [ ] Disable share button if set not synced
    - [ ] Add tooltip: "Share available after syncing"
    - [ ] Check if set has server-generated ID
    - [ ] Only enable share if `set.id` exists and set is synced

### Update CSV Import Flow

- [ ] Modify `hooks/useCsvImport.ts`
  - [ ] Keep existing CSV validation logic
  - [ ] After validation passes, use FlashcardContext
    - [ ] Call `context.createFlashcardSet()`
    - [ ] Pass validated flashcard data
  - [ ] Generate client-side MongoDB-compatible ID
  - [ ] Store set in PowerSync (auto-queues for sync)
  - [ ] Show "Syncing..." indicator immediately
  - [ ] Keep helpers.ts unchanged (validation stays same)

- [ ] Update post-import modal
  - [ ] Show sync status
  - [ ] Disable "Share" button until synced
    - [ ] Check `isSyncing` from context
    - [ ] Add disabled state styles
    - [ ] Show tooltip explaining why disabled
  - [ ] Enable "Study" button immediately (data is local)
  - [ ] Keep "Study any set" button enabled

### Update Public Set Page

- [ ] Modify `app/sets/[setId]/page.tsx`
  - [ ] Add "Save Offline" button for authenticated users
  - [ ] Check if user already has set offline
  - [ ] Check 10-set limit before allowing save
  - [ ] Show modal if limit reached
  - [ ] Call FlashcardContext to save offline
  - [ ] For unauthenticated users, show sign-up prompt

### Testing Phase 1

- [ ] **Test: Basic sync for authenticated user**
  - [ ] Create flashcard set while online
  - [ ] Verify set appears in MongoDB
  - [ ] Open app on second device/browser
  - [ ] Verify set appears automatically
  - [ ] Edit set on device 1
  - [ ] Verify changes appear on device 2

- [ ] **Test: Offline creation and sync**
  - [ ] Go offline (disable network in dev tools)
  - [ ] Create new flashcard set
  - [ ] Verify set appears in UI immediately
  - [ ] Verify sync indicator shows "Will sync when online"
  - [ ] Go online
  - [ ] Verify sync completes
  - [ ] Verify set now has green checkmark
  - [ ] Verify set appears in MongoDB

- [ ] **Test: CSV import while offline**
  - [ ] Go offline
  - [ ] Import CSV file
  - [ ] Verify set appears immediately
  - [ ] Verify share button is disabled
  - [ ] Go online
  - [ ] Verify sync completes
  - [ ] Verify share button becomes enabled
  - [ ] Click share and verify link works

- [ ] **Test: 10-set offline limit**
  - [ ] Mark 10 sets as offline
  - [ ] Try to mark 11th set
  - [ ] Verify modal appears listing current offline sets
  - [ ] Unmark one set in modal
  - [ ] Verify 11th set can now be marked
  - [ ] Verify counter shows "10 of 10"

- [ ] **Test: Public set access**
  - [ ] User A creates public set
  - [ ] User B accesses via share link
  - [ ] User B marks set offline
  - [ ] User A edits a flashcard
  - [ ] Verify User B sees updated card after sync

- [ ] **Test: Unauthenticated user isolation**
  - [ ] Sign out
  - [ ] Create flashcard set
  - [ ] Verify set stays in IndexedDB only
  - [ ] Verify no network requests to PowerSync endpoint
  - [ ] Verify set persists after page refresh

---

## Phase 2: Migration and Simplification (Week 3-4)

### Build Signup Migration Flow

- [ ] Create `lib/migration/signup-migration.ts`
  - [ ] Implement `migrateLocalDataToAccount(userId)` function
    - [ ] Get all flashcard sets from IndexedDB
    - [ ] Get study history for recency sorting
    - [ ] Sort sets by most recently studied
    - [ ] Bulk upload all sets to MongoDB
      ```typescript
      POST /api/migration/upload
      Body: { sets: [...], userId }
      ```
    - [ ] Mark top 10 sets as offline in PowerSync
    - [ ] Clear local IndexedDB after successful migration
    - [ ] Return migration summary

- [ ] Create `app/api/migration/upload/route.ts`
  - [ ] Accept array of flashcard sets
  - [ ] Validate user owns these sets (prevent abuse)
  - [ ] Batch insert to MongoDB
    - [ ] Preserve client-generated IDs if valid
    - [ ] Set `user_id` to authenticated user
    - [ ] Set `created_at` and `updated_at`
  - [ ] Return success/failure for each set
  - [ ] Log migration for debugging

### Update Signup Flow

- [ ] Modify signup completion handler
  - [ ] After successful authentication
  - [ ] Check if user has local flashcard sets
    ```typescript
    const localSets = await getOfflineSets();
    if (localSets.length > 0) {
      // Trigger migration
    }
    ```
  - [ ] Show migration progress modal
    - [ ] "Setting up your account..."
    - [ ] Progress indicator
    - [ ] Don't block - let user see dashboard
  - [ ] Call `migrateLocalDataToAccount(userId)`
  - [ ] Show completion notification
    - [ ] "Your X flashcard sets are now synced"
    - [ ] "Your 10 most recent sets are available offline"
    - [ ] Link to manage offline sets

### Simplify Sync Service

- [ ] Refactor `lib/sync/sync-service.ts`
  - [ ] **Remove PowerSync responsibilities**
    - [ ] Delete flashcard sync logic (PowerSync handles)
    - [ ] Delete pendingChanges tracking (PowerSync handles)
    - [ ] Delete category sync logic (PowerSync handles)
    - [ ] Delete complex metadata fallbacks
  - [ ] **Keep session sync logic**
    - [ ] Keep `queueSession()` for study completion
    - [ ] Keep `processQueue()` with retry
    - [ ] Keep exponential backoff
    - [ ] Simplify to ~100 lines (from 400+)
  - [ ] Rename file to `session-sync-service.ts` for clarity
  - [ ] Update imports throughout codebase

- [ ] Create simplified `SessionSyncQueue` class
  - [ ] Properties
    - [ ] `maxRetries = 3`
    - [ ] `baseDelayMs = 5000`
  - [ ] Methods
    - [ ] `queueSession(session)` - Store in IndexedDB
    - [ ] `processQueue()` - Upload with retries
    - [ ] `uploadSession(session)` - POST to /api/study/sessions
    - [ ] `moveToFailedQueue(session)` - For permanent failures
  - [ ] Remove localStorage metadata complexity
  - [ ] Single source of truth: IndexedDB queue

### Clean Up IndexedDB Stores

- [ ] Modify `lib/db/indexeddb.ts`
  - [ ] **Remove stores PowerSync manages**
    - [ ] Delete `OFFLINE_SETS_STORE` (PowerSync has this)
    - [ ] Delete `CATEGORIES_STORE` (PowerSync has this)
    - [ ] Delete `PENDING_CHANGES_STORE` (PowerSync has this)
  - [ ] **Keep study-specific stores**
    - [ ] Keep `STUDY_RESULTS_STORE`
    - [ ] Keep `SYNC_QUEUE_STORE`
    - [ ] Keep `STUDY_HISTORY_STORE`
    - [ ] Keep `SESSION_METADATA_STORE`
  - [ ] Update DB_VERSION (increment for schema change)
  - [ ] Update `openDB()` to remove deleted stores
  - [ ] Test upgrade path (existing users)

### Update StudySessionContext

- [ ] Modify `contexts/StudySessionContext.tsx`
  - [ ] Keep all existing study logic unchanged
  - [ ] Update set loading to use FlashcardContext
    ```typescript
    const { flashcardSets } = useFlashcards();
    // Instead of fetching from IndexedDB
    ```
  - [ ] Keep bulk upload pattern for session completion
  - [ ] Keep all CardResult tracking
  - [ ] Keep confidence rating logic
  - [ ] Ensure no breaking changes to study flow

### Testing Phase 2

- [ ] **Test: Unauthenticated to authenticated migration**
  - [ ] Sign out
  - [ ] Create 12 flashcard sets while unauthenticated
  - [ ] Study some sets (to create recency data)
  - [ ] Sign up and verify email
  - [ ] Sign in
  - [ ] Verify migration modal appears
  - [ ] Verify all 12 sets appear in library
  - [ ] Verify 10 most recent are marked offline
  - [ ] Verify notification shows correct counts

- [ ] **Test: Session sync simplification**
  - [ ] Complete study session while online
  - [ ] Verify results upload immediately
  - [ ] Complete study session while offline
  - [ ] Verify results queue for sync
  - [ ] Go online
  - [ ] Verify results upload with retry
  - [ ] Check sync-service code is ~100 lines

- [ ] **Test: IndexedDB cleanup**
  - [ ] Verify old stores removed from IndexedDB
  - [ ] Verify study-specific stores still work
  - [ ] Test with existing user (upgrade path)
  - [ ] Verify no data loss

- [ ] **Test: Study flow unchanged**
  - [ ] Start study session
  - [ ] Answer 30 cards
  - [ ] Rate confidence
  - [ ] Complete session
  - [ ] Verify results sync correctly
  - [ ] Verify analytics update
  - [ ] Verify experience feels identical to before

---

## Phase 3: Conflict Resolution UI (Week 5-6)

### Detect Conflicts

- [ ] Create `lib/powersync/conflict-detector.ts`
  - [ ] Listen to PowerSync sync events
  - [ ] Detect when same record edited on multiple devices
  - [ ] Store conflicts in local state
  - [ ] Implement conflict detection logic
    ```typescript
    interface Conflict {
      id: string;
      type: 'flashcard_set' | 'flashcard';
      localVersion: any;
      serverVersion: any;
      timestamp: Date;
    }
    ```

### Build Conflict Resolution UI

- [ ] Create `components/sync/ConflictModal.tsx`
  - [ ] Show conflicts in modal (not during study)
  - [ ] Display both versions side-by-side
    - [ ] Left: Local version
    - [ ] Right: Server version
  - [ ] Highlight differences visually
    - [ ] Changed fields in yellow
    - [ ] Use diff library or custom comparison
  - [ ] Provide resolution options
    - [ ] "Keep Local" button
    - [ ] "Keep Server" button
    - [ ] "Merge Manually" button (advanced)
  - [ ] Show metadata
    - [ ] Last modified timestamp for each version
    - [ ] Which device made the change (if trackable)

- [ ] Create `components/sync/ConflictList.tsx`
  - [ ] Show list of unresolved conflicts
  - [ ] Display count badge in header/nav
    - [ ] "3 conflicts need resolution"
  - [ ] Click to open ConflictModal for each
  - [ ] Sort by most recent first

### Implement Resolution Logic

- [ ] Create `lib/powersync/conflict-resolver.ts`
  - [ ] Implement `resolveConflict(conflictId, resolution)` function
    - [ ] `resolution`: 'local' | 'server' | 'manual'
  - [ ] If 'local': Upload local version to server
  - [ ] If 'server': Replace local with server version
  - [ ] If 'manual': User provides merged data
  - [ ] Remove conflict from queue after resolution
  - [ ] Trigger sync to propagate resolution

### Handle Shared Sets (No Conflicts)

- [ ] Update conflict detection logic
  - [ ] Check set ownership before flagging conflict
  - [ ] If user doesn't own set, auto-resolve to server
    ```typescript
    if (set.user_id !== currentUserId) {
      // Not owner, server wins
      acceptServerVersion();
      return;
    }
    ```
  - [ ] Never show conflict UI for sets user doesn't own
  - [ ] Log auto-resolution for debugging

### Integrate into FlashcardContext

- [ ] Modify `contexts/FlashcardContext.tsx`
  - [ ] Add conflict state
    ```typescript
    const [conflicts, setConflicts] = useState<Conflict[]>([]);
    ```
  - [ ] Subscribe to PowerSync conflict events
  - [ ] Update conflict state when detected
  - [ ] Provide conflict resolution methods
    - [ ] `resolveConflict(id, resolution)`
    - [ ] `getUnresolvedConflicts()`

### Add UI Integration Points

- [ ] Update dashboard/header
  - [ ] Add conflict badge if conflicts exist
    - [ ] Red badge with count
    - [ ] Click to open ConflictList
  - [ ] Show "Resolve Conflicts" in navigation menu

- [ ] Add conflict warning in FlashcardManager
  - [ ] Show warning banner if conflicts exist
  - [ ] "You have unresolved conflicts. Click to resolve."
  - [ ] Prevent editing conflicted sets until resolved

### Testing Phase 3

- [ ] **Test: Basic conflict creation**
  - [ ] Edit same flashcard on device A (offline)
  - [ ] Edit same flashcard on device B (offline)
  - [ ] Bring both online
  - [ ] Verify conflict detected
  - [ ] Verify ConflictModal appears

- [ ] **Test: Conflict resolution - keep local**
  - [ ] Create conflict scenario
  - [ ] Open ConflictModal
  - [ ] Click "Keep Local"
  - [ ] Verify local version uploads to server
  - [ ] Verify other device receives update
  - [ ] Verify conflict removed from queue

- [ ] **Test: Conflict resolution - keep server**
  - [ ] Create conflict scenario
  - [ ] Open ConflictModal
  - [ ] Click "Keep Server"
  - [ ] Verify local version replaced with server
  - [ ] Verify conflict removed from queue

- [ ] **Test: Shared set auto-resolution**
  - [ ] User A shares public set with User B
  - [ ] User B marks set offline
  - [ ] User A edits card while User B offline
  - [ ] User B comes online
  - [ ] Verify no conflict modal shown to User B
  - [ ] Verify User B's version updated to match User A
  - [ ] Verify auto-resolution logged

- [ ] **Test: Multiple conflicts**
  - [ ] Create 3 separate conflicts
  - [ ] Verify badge shows "3"
  - [ ] Resolve one conflict
  - [ ] Verify badge updates to "2"
  - [ ] Resolve remaining conflicts
  - [ ] Verify badge disappears

- [ ] **Test: Conflict during study**
  - [ ] Start study session
  - [ ] Conflict detected in background
  - [ ] Verify modal does NOT interrupt study
  - [ ] Complete study session
  - [ ] Return to dashboard
  - [ ] Verify conflict modal appears at appropriate time

---

## Phase 4: Schema Refactoring (Future - Not Critical for Launch)

*This phase is for future scalability. Implement only after Phases 1-3 are stable and validated.*

### Design Flat Schema

- [ ] Document new MongoDB schema design
  - [ ] `flashcard_sets` collection (metadata only)
    ```typescript
    {
      _id: ObjectId,
      user_id: ObjectId,
      title: string,
      description: string,
      is_public: boolean,
      card_count: number,
      created_at: Date,
      updated_at: Date
    }
    ```
  - [ ] `flashcards` collection (separate documents)
    ```typescript
    {
      _id: ObjectId,
      set_id: ObjectId,
      user_id: ObjectId, // denormalized
      front: string,
      back: string,
      front_image: string,
      back_image: string,
      order: number, // for sorting
      created_at: Date,
      updated_at: Date
    }
    ```
  - [ ] Add indexes
    - [ ] `flashcards`: (set_id, order)
    - [ ] `flashcards`: (user_id, set_id)

### Create Migration Script

- [ ] Create `scripts/migrate-to-flat-schema.ts`
  - [ ] Read all flashcard_sets from MongoDB
  - [ ] For each set with nested flashcards:
    - [ ] Extract flashcards array
    - [ ] Create separate flashcard documents
    - [ ] Link via set_id
    - [ ] Preserve order
    - [ ] Delete flashcards array from set
  - [ ] Add dry-run mode for testing
  - [ ] Add rollback capability
  - [ ] Log progress and errors

### Update Mongoose Models

- [ ] Modify `models/FlashcardSet.ts`
  - [ ] Remove nested FlashcardSchema
  - [ ] Keep only set metadata
  - [ ] Remove flashcards array field

- [ ] Create `models/Flashcard.ts`
  - [ ] Define standalone Flashcard model
  - [ ] Add set_id reference
  - [ ] Add indexes

### Update API Endpoints

- [ ] Update all flashcard_set endpoints
  - [ ] `GET /api/sets/:id` - Join with flashcards collection
  - [ ] `POST /api/sets` - Create set + flashcards separately
  - [ ] `PUT /api/sets/:id` - Update set metadata only
  - [ ] `DELETE /api/sets/:id` - Cascade delete flashcards

- [ ] Create new flashcard endpoints
  - [ ] `GET /api/sets/:setId/flashcards`
  - [ ] `POST /api/sets/:setId/flashcards`
  - [ ] `PUT /api/flashcards/:id`
  - [ ] `DELETE /api/flashcards/:id`

### Update PowerSync Configuration

- [ ] Simplify `app/api/powersync/route.ts`
  - [ ] Remove transformation layer
  - [ ] Direct pass-through from MongoDB to PowerSync
  - [ ] No more flatten/reconstruct logic

- [ ] Update `lib/powersync/schema.ts`
  - [ ] Schema now matches MongoDB exactly
  - [ ] Add proper foreign key relationships

### Update Application Code

- [ ] Update FlashcardContext
  - [ ] Query flashcards separately from sets
  - [ ] Update CRUD operations for new schema

- [ ] Update all components that work with flashcards
  - [ ] FlashcardManager
  - [ ] StudySessionContext
  - [ ] CSV import flow

### Testing Phase 4

- [ ] **Test: Migration script**
  - [ ] Run on test database copy
  - [ ] Verify all flashcards migrated correctly
  - [ ] Verify no data loss
  - [ ] Verify set counts match
  - [ ] Test rollback functionality

- [ ] **Test: API endpoints**
  - [ ] Test all CRUD operations
  - [ ] Verify joins work correctly
  - [ ] Check performance improvements
  - [ ] Test with large sets (1000+ cards)

- [ ] **Test: PowerSync with new schema**
  - [ ] Verify sync works with flat structure
  - [ ] Test offline creation
  - [ ] Test conflict resolution
  - [ ] Verify no regressions

---

## Cross-Phase Monitoring & Debugging

### Logging Setup

- [ ] Add comprehensive logging throughout
  - [ ] PowerSync connection events
  - [ ] Sync start/complete events
  - [ ] Conflict detection
  - [ ] Migration progress
  - [ ] Use existing Logger from `lib/logging/client-logger.ts`

### Error Tracking

- [ ] Add error boundaries around PowerSync components
  - [ ] Catch and log PowerSync errors
  - [ ] Show user-friendly error messages
  - [ ] Provide retry options

### Performance Monitoring

- [ ] Track sync performance metrics
  - [ ] Time to first sync
  - [ ] Sync duration
  - [ ] Number of records synced
  - [ ] Conflict frequency

### User Feedback

- [ ] Add sync status indicators throughout UI
  - [ ] Global sync indicator in header
  - [ ] Per-set sync status
  - [ ] Offline mode indicator (already exists)

---

## Documentation

- [ ] Document PowerSync architecture
  - [ ] System diagram
  - [ ] Data flow diagrams
  - [ ] Sequence diagrams for key operations

- [ ] Write developer guide
  - [ ] How to add new synced tables
  - [ ] How conflict resolution works
  - [ ] Troubleshooting common issues

- [ ] Update README
  - [ ] Add PowerSync setup instructions
  - [ ] Document new environment variables (if any)
  - [ ] Update feature list

---

## Launch Preparation

- [ ] Security audit
  - [ ] Review PowerSync authentication
  - [ ] Check permission enforcement
  - [ ] Verify data isolation between users

- [ ] Performance testing
  - [ ] Test with 10,000+ flashcards
  - [ ] Test with 100+ offline sets
  - [ ] Test slow network conditions

- [ ] User acceptance testing
  - [ ] Get feedback from beta users
  - [ ] Fix critical issues
  - [ ] Refine UI based on feedback

- [ ] Rollout plan
  - [ ] Enable for small percentage of users first
  - [ ] Monitor for issues
  - [ ] Gradually increase rollout
  - [ ] Keep rollback option available

---

## Notes

- **Estimated Timeline**: 6-8 weeks total
  - Phase 1: 2 weeks
  - Phase 2: 2 weeks  
  - Phase 3: 2 weeks
  - Phase 4: Future (2-4 weeks when ready)

- **Team Requirement**: 1-2 developers familiar with TypeScript, React, MongoDB

- **Critical Path Items**: Phases 1-3 must complete in order. Phase 4 can be delayed.

- **Rollback Strategy**: Each phase can be rolled back independently by feature flag or code revert.

- **Success Metrics**:
  - Zero data loss during migration
  - <5 second sync time for typical data volumes
  - <1% conflict rate
  - 99.9% sync success rate (after retries)
