import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useFlashcards } from '@/contexts/FlashcardContext';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export function useMigration() {
  const { flashcardSets, createFlashcardSet, createFlashcard } = useFlashcards();
  const { data: session } = useSession();

  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationProgress, setMigrationProgress] = useState({
    total: 0,
    completed: 0,
    currentBatch: 0,
  });

  const migrateAllSets = useCallback(async (options?: { onComplete?: () => void }) => {
    if (!session?.user?.id) {
      alert('You must be signed in to migrate sets');
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

    try {
      while (hasMore) {
        Logger.log(LogContext.FLASHCARD, 'Fetching migration batch', { skip, limit });

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
      options?.onComplete?.();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      setError(`Migration failed: ${errorMsg}`);
      Logger.error(LogContext.FLASHCARD, 'Migration failed', { error: e });
      alert(`Migration failed: ${errorMsg}`);
    } finally {
      setMigrating(false);
      setMigrationProgress({ total: 0, completed: 0, currentBatch: 0 });
    }
  }, [session, createFlashcardSet, createFlashcard]);

  return { migrating, error, migrationProgress, migrateAllSets };
}