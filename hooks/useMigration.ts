/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useFlashcards } from '@/contexts/FlashcardContext';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { useToast } from './use-toast';
import { usePowerSync } from '@powersync/react';
import { PowerSyncFlashcardSet } from '@/lib/powersync/schema';

interface MigrateAllSetsOptions {
  onComplete?: () => void;
  onError?: (error: unknown) => void;
}

export function useMigration() {
  const { flashcardSets, createFlashcardSet, createFlashcard } = useFlashcards();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const powerSync = usePowerSync();

  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationProgress, setMigrationProgress] = useState({
    total: 0,
    completed: 0,
    currentBatch: 0,
  });

  const migrateAllSets = async ({ onComplete, onError }: MigrateAllSetsOptions = {}) => {
    if (status !== 'authenticated' || !session?.user?.id) {
      alert('You must be signed in to migrate sets');
      Logger.error(LogContext.SYSTEM, 'Migration failed: User not authenticated');
      // --- CALL onError IF IT EXISTS ---
      onError?.(new Error('User not authenticated'));
      // --- END CALL ---
      return;
    }

    if (!confirm('Migrate ALL sets from MongoDB to PowerSync? This will take several minutes.')) {
      return;
    }

    setMigrating(true);
    setError(null);
    
    let skip = 0;
    const limit = 10; // Process 10 sets per batch
    let hasMore = true;
    let totalMigrated = 0;

    if (status !== 'authenticated' || !session?.user?.id) {
      Logger.error(LogContext.SYSTEM, 'Migration failed: User not authenticated');
      // --- CALL onError IF IT EXISTS ---
      onError?.(new Error('User not authenticated'));
      // --- END CALL ---
      return;
    }

    try {
      while (hasMore) {
        Logger.log(LogContext.FLASHCARD, 'Fetching migration batch', { skip, limit });
        Logger.log(LogContext.SYSTEM, 'Starting migration for all sets...');

        const response = await fetch('/api/migrate-to-powersync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            migrateAll: true, // Admin migration flag
            limit,
            skip,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Migration API failed');
        }

        const { sets, pagination } = await response.json();

        Logger.log(LogContext.SYSTEM, 'Migration API call successful', { count: sets.migratedSetsCount });

        setMigrationProgress({
          total: pagination.total,
          completed: skip,
          currentBatch: sets.length,
        });

        for (const mongoSet of sets) {
          Logger.log(LogContext.FLASHCARD, 'Migrating set', { 
            title: mongoSet.title,
            cardCount: mongoSet.cardCount 
          });

          try {
            const existingSet = flashcardSets.find(s => s.title === mongoSet.title);

            if (existingSet) {
              Logger.log(LogContext.FLASHCARD, 'Set already exists, skipping', { title: mongoSet.title });
              totalMigrated++;
              continue;
            }

            const setId = await createFlashcardSet({
              user_id: session.user.id,
              title: mongoSet.title,
              description: mongoSet.description,
              is_public: mongoSet.isPublic ? 1 : 0,
              card_count: mongoSet.cardCount,
              source: mongoSet.source,
              is_deleted: 0,
            });

            for (let i = 0; i < mongoSet.flashcards.length; i++) {
              const card = mongoSet.flashcards[i];
              await createFlashcard({ set_id: setId, user_id: session.user.id, front: card.front, back: card.back, front_image: card.frontImage, back_image: card.backImage, order: i });
            }

            totalMigrated++;
            Logger.log(LogContext.FLASHCARD, 'Set migrated successfully', { title: mongoSet.title, totalMigrated });
          } catch (err) {
            Logger.error(LogContext.FLASHCARD, 'Failed to migrate individual set', { error: err, title: mongoSet.title });
          }
        }

        hasMore = pagination.hasMore;
        skip += limit;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      alert(`Migration complete! ${totalMigrated} sets migrated to PowerSync.`);
      Logger.log(LogContext.FLASHCARD, 'Migration complete', { totalMigrated });
      // options?.onComplete?.();
      if (onComplete) {
        onComplete();
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      setError(`Migration failed: ${errorMsg}`);
      Logger.error(LogContext.FLASHCARD, 'Migration failed', { error: e });
      Logger.error(LogContext.SYSTEM, 'Migration failed', { error });
      if (onError) {
        onError(error);
      }
      alert(`Migration failed: ${errorMsg}`);
    } finally {
      setMigrating(false);
      setMigrationProgress({ total: 0, completed: 0, currentBatch: 0 });
    }
  };

  const clearLocalCache = async () => {
    try {
      Logger.log(LogContext.SYSTEM, 'Clearing local PowerSync cache...');
      await powerSync.disconnectAndClear();

      // Re-initialize local database
      const { initPowerSync } = await import('@/lib/powersync/client');
      await initPowerSync();

      toast({
        title: 'Cache Cleared',
        description: 'Local data has been cleared. Please refresh the page to re-sync.',
      });
      Logger.log(LogContext.SYSTEM, 'PowerSync cache cleared and re-initialized.');
    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Failed to clear local cache', { error });
      toast({
        title: 'Error',
        description: 'Could not clear local cache. Please refresh the page.',
        variant: 'destructive',
      });
    }
  };

  return { migrating, error, migrationProgress, migrateAllSets, clearLocalCache };
}