# Issue #5 Fix - Installation Guide

## What This Fixes

**Problem**: Study sessions complete but results don't sync properly between IndexedDB (local storage) and MongoDB (server database).

**Symptoms**:
- Session shows complete but results page is empty
- Data lost when browser closes
- Inconsistent sync between devices

**Solution**: Enhanced transaction safety, proper async handling, and automatic background sync.

---

## Files to Update

### 1. Replace `lib/db/indexeddb.ts`

**Path**: `lib/db/indexeddb.ts`

**Action**: Replace entire file with `indexeddb-enhanced.ts`

**Why**: 
- Adds transaction completion callbacks
- Implements proper error handling
- Adds retry count tracking
- Includes storage utilities

**Changes**:
```bash
# Backup current file
cp lib/db/indexeddb.ts lib/db/indexeddb.ts.backup

# Replace with new version
cp /path/to/indexeddb-enhanced.ts lib/db/indexeddb.ts
```

### 2. Replace `contexts/StudySessionContext.tsx`

**Path**: `contexts/StudySessionContext.tsx`

**Action**: Replace entire file with `StudySessionContext-fixed.tsx`

**Why**:
- Adds sync status tracking
- Waits for saves before navigation
- Implements proper async flow
- Better error recovery

**Changes**:
```bash
# Backup current file
cp contexts/StudySessionContext.tsx contexts/StudySessionContext.tsx.backup

# Replace with new version
cp /path/to/StudySessionContext-fixed.tsx contexts/StudySessionContext.tsx
```

### 3. Add New Sync Service

**Path**: `lib/services/sessionSyncService.ts`

**Action**: Create new file

**Why**:
- Processes sync queue automatically
- Retries failed syncs
- Runs in background
- Cleans up after success

**Changes**:
```bash
# Create services directory if needed
mkdir -p lib/services

# Add new file
cp /path/to/sessionSyncService.ts lib/services/sessionSyncService.ts
```

### 4. Update Root Layout (Initialize Sync Service)

**Path**: `app/layout.tsx`

**Action**: Add sync service initialization

**Add this import**:
```typescript
import { initializeSyncService } from '@/lib/services/sessionSyncService';
```

**Add this code in a useEffect** (if client component) or **after closing body tag** (if server component):

For Client Component:
```typescript
'use client';

import { useEffect } from 'react';
import { initializeSyncService } from '@/lib/services/sessionSyncService';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize sync service on app load
    initializeSyncService();
  }, []);

  return (
    // ... rest of layout
  );
}
```

For Server Component (add script tag):
```typescript
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                import('@/lib/services/sessionSyncService').then(module => {
                  module.initializeSyncService();
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
```

---

## Testing the Fix

### Test 1: Complete Session (Online)

1. Start a study session
2. Complete all cards
3. Watch browser console for logs:
   - "Study history saved successfully"
   - "Session queued for sync"
   - "Session synced to server"
4. Verify redirect to results page happens AFTER logs
5. Check results page displays correctly

**Expected**: All data appears, no errors

### Test 2: Complete Session (Offline)

1. Disconnect internet
2. Start and complete a study session
3. Check browser console:
   - "Study history saved successfully"
   - "Session queued for sync"
4. Reconnect internet
5. Watch for: "Network connection restored, syncing queued sessions"
6. Navigate to results page

**Expected**: Results appear, sync happens in background

### Test 3: Verify Sync Queue

Open browser console and run:
```javascript
// Check queued sessions
import { getQueuedSessions } from '@/lib/db/indexeddb';
getQueuedSessions().then(console.log);

// Force sync manually
import { syncNow } from '@/lib/services/sessionSyncService';
syncNow().then(console.log);
```

**Expected**: Queue processes, sessions sync

### Test 4: Browser Close During Session

1. Start session
2. Answer 2-3 cards
3. Close browser tab immediately
4. Reopen app
5. Check IndexedDB (Chrome DevTools > Application > IndexedDB)

**Expected**: Card results saved in `study-results` store

---

## Verifying IndexedDB Schema

Open Chrome DevTools > Application > IndexedDB > flashlearnai-db

You should see these stores:
- `study-results` - Individual card attempts
- `sync-queue` - Sessions waiting to sync
- `study-history` - Completed sessions
- `offline-sets` - Downloaded flashcard sets
- `categories` - User categories
- `pending-changes` - Unsynced edits

---

## Common Issues

### Issue: "TypeError: Cannot read property 'transaction' of null"

**Cause**: IndexedDB not initialized

**Fix**: Ensure `openDB()` is awaited before any operation

### Issue: Results page shows "Results Not Available"

**Cause**: Session not in history or history not saved

**Fix**: Check browser console for errors during `completeSession()`. Verify `saveStudyHistory` completed.

### Issue: Sessions stuck in sync queue

**Cause**: Network errors or authentication issues

**Fix**: 
1. Check if user is logged in
2. Verify API endpoint working: `POST /api/study/sessions`
3. Check browser console for 401 or 429 errors

### Issue: Duplicate syncs

**Cause**: Multiple sync service instances

**Fix**: Ensure `initializeSyncService()` called only once in root layout

---

## Rollback Plan

If issues occur, rollback to backup files:

```bash
# Restore IndexedDB
cp lib/db/indexeddb.ts.backup lib/db/indexeddb.ts

# Restore Context
cp contexts/StudySessionContext.tsx.backup contexts/StudySessionContext.tsx

# Remove sync service
rm lib/services/sessionSyncService.ts

# Remove initialization from layout
# (manually edit app/layout.tsx)

# Restart dev server
npm run dev
```

---

## Performance Impact

**Positive**:
- Faster perceived response (saves happen in background)
- Automatic retry reduces data loss
- Better offline experience

**Negative**:
- Slightly larger bundle size (+~5KB minified)
- Background sync uses some CPU when queue is full

**Overall**: Net positive. Users won't notice performance difference.

---

## Database Migration

The IndexedDB schema update will trigger automatically on first load:

1. Browser detects DB_VERSION changed (2 → 3)
2. Runs `onupgradeneeded` handler
3. Creates new indexes
4. Existing data preserved

**No manual migration needed.**

---

## Monitoring in Production

Add these logs to your monitoring service:

```typescript
// Track sync failures
Logger.error(LogContext.SYSTEM, 'Sync failed after max retries', {
  sessionId,
  retryCount
});

// Track sync success rate
Logger.log(LogContext.SYSTEM, 'Sync batch completed', {
  total,
  success,
  failed
});
```

**Metrics to monitor**:
- Sync success rate (should be >95%)
- Average retry count (should be <2)
- Queue size over time (should stay near 0)

---

## Next Steps After Installation

1. Run all tests
2. Test on multiple browsers (Chrome, Firefox, Safari)
3. Test on mobile devices
4. Monitor logs for 24 hours
5. Check sync queue size in production
6. Deploy to production if all tests pass

---

## Support

If you encounter issues:

1. Check browser console for error logs
2. Verify IndexedDB stores exist and contain data
3. Test sync manually using `syncNow()` function
4. Check API endpoint responses
5. Review server logs for sync errors

For hiring managers: This demonstrates full-stack debugging, transaction management, offline-first architecture, and production-ready error handling.
