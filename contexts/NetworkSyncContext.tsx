'use client';

import React, { createContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { OfflineSyncService, SyncEventData } from '@/lib/services/syncService';
import { useToast } from '@/hooks/use-toast';

interface NetworkSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  conflictCount: number;
  lastSyncedAt: Date | null;
  syncError: string | null;
  forceSync: () => Promise<void>;
}

const NetworkSyncContext = createContext<NetworkSyncState | undefined>(undefined);

export function NetworkSyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [conflictCount, setConflictCount] = useState(0);
  const { toast } = useToast();

  const prevOnlineRef = useRef(isOnline);
  const hadPendingRef = useRef(false);

  // Subscribe to OfflineSyncService events
  useEffect(() => {
    const service = OfflineSyncService.getInstance();

    // Get initial pending and conflict counts
    service.getPendingCount().then(count => {
      setPendingCount(count);
      hadPendingRef.current = count > 0;
    });
    service.getConflictCount().then(setConflictCount);

    const unsubscribe = service.subscribe((event: SyncEventData) => {
      setIsOnline(event.isOnline);
      setIsSyncing(event.isSyncing);
      setPendingCount(event.pendingCount);
      setSyncedCount(event.syncedCount);
      setConflictCount(event.conflictCount);
      if (event.lastSyncedAt) setLastSyncedAt(event.lastSyncedAt);

      if (event.type === 'sync-start') {
        setSyncError(null);
        hadPendingRef.current = event.pendingCount > 0;
      }

      if (event.type === 'sync-error') {
        setSyncError(event.error || 'Sync failed');
      }

      if (event.type === 'sync-complete') {
        setSyncError(null);
      }

      if (event.type === 'conflict-detected') {
        // Conflict count is already updated via event.conflictCount
      }
    });

    return unsubscribe;
  }, []);

  // Also listen to window events for immediate UI response
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Toast notifications on state transitions
  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (wasOnline && !isOnline) {
      toast({
        title: "You're offline",
        description: 'Your progress will be saved locally.',
      });
    }

    if (!wasOnline && isOnline) {
      // Check pending count to determine message
      OfflineSyncService.getInstance().getPendingCount().then(count => {
        if (count > 0) {
          toast({
            title: 'Back online',
            description: `Syncing ${count} item${count !== 1 ? 's' : ''}...`,
          });
        } else {
          toast({
            title: 'Back online',
            description: 'You are connected.',
          });
        }
      });
    }
  }, [isOnline, toast]);

  // Toast on sync complete or error
  const prevSyncingRef = useRef(false);
  useEffect(() => {
    const wasSyncing = prevSyncingRef.current;
    prevSyncingRef.current = isSyncing;

    if (wasSyncing && !isSyncing && !syncError && hadPendingRef.current) {
      toast({
        title: 'All synced',
        description: 'Your data is up to date.',
      });
      hadPendingRef.current = false;
    }
  }, [isSyncing, syncError, toast]);

  useEffect(() => {
    if (syncError) {
      toast({
        title: 'Sync failed',
        description: 'Will retry automatically.',
        variant: 'destructive',
      });
    }
  }, [syncError, toast]);

  // Toast on conflict detection
  const prevConflictRef = useRef(0);
  useEffect(() => {
    if (conflictCount > prevConflictRef.current) {
      toast({
        title: 'Sync conflict detected',
        description: `${conflictCount} item${conflictCount !== 1 ? 's' : ''} need${conflictCount === 1 ? 's' : ''} your review.`,
        variant: 'destructive',
      });
    }
    prevConflictRef.current = conflictCount;
  }, [conflictCount, toast]);

  const forceSync = useCallback(async () => {
    const service = OfflineSyncService.getInstance();
    await service.forceSync();
  }, []);

  const value: NetworkSyncState = {
    isOnline,
    isSyncing,
    pendingCount,
    syncedCount,
    conflictCount,
    lastSyncedAt,
    syncError,
    forceSync,
  };

  return (
    <NetworkSyncContext.Provider value={value}>
      {children}
    </NetworkSyncContext.Provider>
  );
}

export { NetworkSyncContext };
