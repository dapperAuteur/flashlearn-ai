'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { usePowerSync, useQuery } from '@powersync/react';
import {
  PowerSyncFlashcardSet,
  PowerSyncOfflineSet,
  PowerSyncFlashcard,
  generateMongoId,
  boolToInt
} from '@/lib/powersync/schema';
import { savePendingChange } from '@/lib/db/indexeddb';
import { OfflineSyncService } from '@/lib/services/syncService';
import { Logger, LogContext } from '@/lib/logging/client-logger';


interface FlashcardContextType {
  flashcardSets: PowerSyncFlashcardSet[];
  offlineSets: PowerSyncOfflineSet[];
  isSyncing: boolean;
  isOnline: boolean;
  createFlashcardSet: (set: Omit<PowerSyncFlashcardSet, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  createFlashcard: (card: Omit<PowerSyncFlashcard, 'id' | 'created_at' | 'updated_at'>) => Promise<string>; // Add this
  updateFlashcardSet: (id: string, updates: Partial<PowerSyncFlashcardSet>) => Promise<void>;
  deleteFlashcardSet: (id: string) => Promise<void>;
  toggleOfflineAvailability: (setId: string) => Promise<void>;
}

const FlashcardContext = createContext<FlashcardContextType | undefined>(undefined);
const MAX_OFFLINE_SETS = 10;

export function FlashcardProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const powerSync = usePowerSync();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);

  const userId = session?.user?.id || '';
  const shouldQuery = !!powerSync;

  // For authenticated users: show their sets + public sets
  // For unauthenticated: show only public sets
  const { data: flashcardSets = [] } = useQuery<PowerSyncFlashcardSet>(
    shouldQuery 
      ? userId
        ? 'SELECT * FROM flashcard_sets WHERE (user_id = ? OR is_public = 1) AND is_deleted = 0 ORDER BY updated_at DESC'
        : 'SELECT * FROM flashcard_sets WHERE is_public = 1 AND is_deleted = 0 ORDER BY updated_at DESC'
      : '',
    shouldQuery 
      ? userId 
        ? [userId] 
        : [] // Empty array for public query (no parameters needed)
      : []
  );

  const { data: offlineSets = [] } = useQuery<PowerSyncOfflineSet>(
    shouldQuery && userId
      ? 'SELECT * FROM offline_sets WHERE user_id = ? ORDER BY last_accessed DESC'
      : '',
    shouldQuery && userId ? [userId] : []
  );

  // Online/offline listener
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

  // PowerSync connection
  useEffect(() => {
    if (!userId || !powerSync) return;

    let mounted = true;

    const setupSync = async () => {
      try {
        setIsSyncing(true);
        
        // PowerSync connection happens in lib/powersync/client.ts
        // Just monitor sync status here
        powerSync.registerListener({
          initialized: () => {
            if (mounted) {
              Logger.log(LogContext.SYSTEM, 'PowerSync initialized', { userId });
            }
          },
          sessionStarted: () => {
            if (mounted) {
              setIsSyncing(true);
            }
          },
          sessionCompleted: () => {
            if (mounted) {
              setIsSyncing(false);
            }
          },
        });
        
      } catch (error) {
        if (mounted) {
          Logger.error(LogContext.SYSTEM, 'PowerSync connection failed', {
            error
          });
        }
      } finally {
        if (mounted) {
          setIsSyncing(false);
        }
      }
    };
    setupSync();
    
    return () => {
      mounted = false;
    };
  }, [userId, powerSync]);

  // Define createFlashcard function
  const createFlashcard = async (
    card: Omit<PowerSyncFlashcard, 'id' | 'created_at' | 'updated_at'>
    ): Promise<string> => {
    if (!powerSync) throw new Error('PowerSync not initialized');
  const id = generateMongoId();
  const now = new Date().toISOString();
  
  await powerSync.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO flashcards (id, set_id, user_id, front, back, front_image, back_image, "order", created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        card.set_id, 
        card.user_id, 
        card.front, 
        card.back, 
        card.front_image || null, 
        card.back_image || null, 
        card.order, 
        now, 
        now
      ]
    );
  });
  Logger.log(LogContext.FLASHCARD, 'Flashcard created', { id, set_id: card.set_id });
    return id;
};

  const createFlashcardSet = async (
    set: Omit<PowerSyncFlashcardSet, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string> => {
    if (!powerSync) throw new Error('PowerSync not initialized');

    const id = generateMongoId();
    const now = new Date().toISOString();

    await powerSync.writeTransaction(async (tx) => {
      await tx.execute(
        `INSERT INTO flashcard_sets (id, user_id, title, description, is_public, card_count, source, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, set.user_id, set.title, set.description || null, set.is_public, set.card_count, set.source, now, now, 0]
      );
    });

    // PowerSync CRUD tracking handles syncing this set to the server.
    // Trigger a full sync to also pull latest data and push study sessions.
    if (navigator.onLine) OfflineSyncService.getInstance().syncAllPendingData();

    Logger.info(LogContext.FLASHCARD, 'Flashcard set created', { id, title: set.title });
    return id;
  };

  const updateFlashcardSet = async (id: string, updates: Partial<PowerSyncFlashcardSet>) => {
    if (!powerSync) throw new Error('PowerSync not initialized');

    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), new Date().toISOString(), id];

    await powerSync.execute(
      `UPDATE flashcard_sets SET ${setClauses}, updated_at = ? WHERE id = ?`,
      values
    );

    await savePendingChange({
      id: `set-update-${id}-${Date.now()}`,
      entity: 'set',
      type: 'update',
      data: { _id: id, ...updates },
      timestamp: new Date(),
      retryCount: 0,
    });
    if (navigator.onLine) OfflineSyncService.getInstance().syncAllPendingData();

    Logger.log(LogContext.FLASHCARD, 'Flashcard set updated', { id });
  };

  const deleteFlashcardSet = async (id: string) => {
    if (!powerSync) throw new Error('PowerSync not initialized');

    await powerSync.execute(
      'UPDATE flashcard_sets SET is_deleted = 1, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );

    await savePendingChange({
      id: `set-delete-${id}`,
      entity: 'set',
      type: 'delete',
      data: { _id: id },
      timestamp: new Date(),
      retryCount: 0,
    });
    if (navigator.onLine) OfflineSyncService.getInstance().syncAllPendingData();

    Logger.log(LogContext.FLASHCARD, 'Flashcard set deleted', { id });
  };

  const toggleOfflineAvailability = async (setId: string) => {
    if (!powerSync) throw new Error('PowerSync not initialized');
    if (!userId) throw new Error('User not authenticated');

    const existing = offlineSets.find(s => s.set_id === setId);

    if (existing) {
      await powerSync.execute('DELETE FROM offline_sets WHERE id = ?', [existing.id]);
      Logger.log(LogContext.FLASHCARD, 'Set removed from offline', { setId });
    } else {
      if (offlineSets.length >= MAX_OFFLINE_SETS) {
        throw new Error(`Maximum ${MAX_OFFLINE_SETS} offline sets reached`);
      }

      const set = flashcardSets.find(s => s.id === setId);
      const id = generateMongoId();
      const now = new Date().toISOString();

      await powerSync.execute(
        `INSERT INTO offline_sets (id, user_id, set_id, is_owned, last_accessed, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, userId, setId, boolToInt(set?.user_id === userId), now, now]
      );

      Logger.log(LogContext.FLASHCARD, 'Set added to offline', { setId });
    }
  };

  const value: FlashcardContextType = {
    flashcardSets,
    offlineSets,
    isSyncing,
    isOnline,
    createFlashcardSet,
    createFlashcard,
    updateFlashcardSet,
    deleteFlashcardSet,
    toggleOfflineAvailability,
  };

  return (
    <FlashcardContext.Provider value={value}>
      {children}
    </FlashcardContext.Provider>
  );
}

// Custom hook to use the context
export function useFlashcards() {
  const context = useContext(FlashcardContext);
  if (!context) {
    throw new Error('useFlashcards must be used within FlashcardProvider');
  }
  return context;
}