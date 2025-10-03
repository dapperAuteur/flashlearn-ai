/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { usePowerSync, useQuery } from '@powersync/react';
import { PowerSyncFlashcardSet, PowerSyncOfflineSet, generateMongoId, boolToInt } from '@/lib/powersync/schema';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { getPowerSync } from '@/lib/powersync/client';


interface FlashcardContextType {
  flashcardSets: PowerSyncFlashcardSet[];
  offlineSets: PowerSyncOfflineSet[];
  isSyncing: boolean;
  isOnline: boolean;
  createFlashcardSet: (set: Omit<PowerSyncFlashcardSet, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
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

  const userId = session?.user?.id;

  const { data: flashcardSets = [] } = useQuery<PowerSyncFlashcardSet>(
    'SELECT * FROM flashcard_sets WHERE user_id = ? AND is_deleted = 0 ORDER BY updated_at DESC',
    [userId || '']
  );

  const { data: offlineSets = [] } = useQuery<PowerSyncOfflineSet>(
    'SELECT * FROM offline_sets WHERE user_id = ? ORDER BY last_accessed DESC',
    [userId || '']
  );

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

  // Simplified connection - full sync setup in next phase
  useEffect(() => {
    if (!userId || !powerSync) return;
    const connect = async () => {
      try {
        setIsSyncing(true);
        await powerSync.connect({
          remote: {
            uploadData: async (database) => {
              const changes = await database.getLocalChanges();
              const response = await fetch('/api/powersync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ changes }),
              });
              if (!response.ok) throw new Error('Push failed');
            },
          },
        });
        
        Logger.log(LogContext.SYSTEM, 'PowerSync connected', { userId });
      } catch (error) {
        Logger.error(LogContext.SYSTEM, 'PowerSync connection failed', { error });
      } finally {
        setIsSyncing(false);
      }
    };
    connect();
    return () => {
      powerSync.disconnect();
    };
  }, [userId, powerSync]);

  const createFlashcardSet = async (
    set: Omit<PowerSyncFlashcardSet, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string> => {
    const id = generateMongoId();
    const now = new Date().toISOString();

    console.log('About to execute INSERT');
    console.log('PowerSync instance:', powerSync);

    console.log('PowerSync from context:', powerSync);
    console.log('PowerSync methods:', Object.keys(powerSync));
    try {
    
      const promise = await powerSync.writeTransaction(async (tx) => {
        await tx.execute(
          `INSERT INTO flashcard_sets (id, user_id, title, description, is_public, card_count, source, created_at, updated_at, is_deleted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, set.user_id, set.title, set.description, set.is_public, set.card_count, set.source, now, now, 0]
        );
      });

      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('INSERT timeout after 5s')), 5000)
      );
      
      await Promise.race([promise, timeout]);

      console.log('INSERT completed');
    } catch (error) {
      console.error('INSERT failed:', error);
      throw error;
    }
    
    Logger.info(LogContext.FLASHCARD, 'Flashcard set created', { id, title: set.title });
    return id;
  };

  const updateFlashcardSet = async (id: string, updates: Partial<PowerSyncFlashcardSet>) => {
    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), new Date().toISOString(), id];
    
    await powerSync.execute(
      `UPDATE flashcard_sets SET ${setClauses}, updated_at = ? WHERE id = ?`,
      values
    );
    
    Logger.log(LogContext.FLASHCARD, 'Flashcard set updated', { id });
  };

  const deleteFlashcardSet = async (id: string) => {
    await powerSync.execute(
      'UPDATE flashcard_sets SET is_deleted = 1, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );
    
    Logger.log(LogContext.FLASHCARD, 'Flashcard set deleted', { id });
  };

  const toggleOfflineAvailability = async (setId: string) => {
    if (!userId) return;

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
    updateFlashcardSet,
    deleteFlashcardSet,
    toggleOfflineAvailability,
  };

  return <FlashcardContext.Provider value={value}>{children}</FlashcardContext.Provider>;
}

export function useFlashcards() {
  const context = useContext(FlashcardContext);
  if (!context) {
    throw new Error('useFlashcards must be used within FlashcardProvider');
  }
  return context;
}