/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFlashcards } from '@/contexts/FlashcardContext';
import { useSession } from 'next-auth/react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useStudySession } from '@/contexts/StudySessionContext';
import { LogContext, Logger } from '@/lib/logging/client-logger';

interface Props {
  onOfflineStudy: (setId: string) => void;
}

export default function FlashcardManagerV2({ onOfflineStudy }: Props) {
  const router = useRouter();
  const { startSession } = useStudySession();
  const {
    flashcardSets,
    offlineSets,
    toggleOfflineAvailability,
    createFlashcardSet, 
    createFlashcard 
  } = useFlashcards();
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationProgress, setMigrationProgress] = useState({
    total: 0,
    completed: 0,
    currentBatch: 0,
  });

  // DEBUG: Check what we're getting
  console.log('FlashcardManagerV2 - flashcardSets:', flashcardSets);
  console.log('FlashcardManagerV2 - session user:', session?.user?.id);
  console.log('FlashcardManagerV2 - offlineSets:', offlineSets);

  // Add this handler
  const handleStudyClick = (setId: string) => {
    const isSetOffline = offlineSets.some(s => s.set_id === setId);
    
    if (!navigator.onLine) {
      if (!isSetOffline) {
        setError('This set is not available offline');
        return;
      }
      // Offline: use static page
      onOfflineStudy(setId);
    } else {
      // Online: use dynamic page
      router.push(`/study/${setId}`);
    }
  };


  const handleToggle = async (setId: string) => {
  try {
    setError(null);
    await toggleOfflineAvailability(setId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle offline');
    }
  };

  const migrateAllSets = async () => {
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

        // Fetch batch from MongoDB
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

        // Update progress
        setMigrationProgress({
          total: pagination.total,
          completed: skip,
          currentBatch: sets.length,
        });

        // Migrate each set in this batch
        for (const mongoSet of sets) {
          Logger.log(LogContext.FLASHCARD, 'Migrating set', { 
            title: mongoSet.title,
            cardCount: mongoSet.cardCount 
          });

          try {
            // Check if set already exists (by mongoId or title)
            const existingSet = flashcardSets.find(
              s => s.title === mongoSet.title
            );

            if (existingSet) {
              Logger.log(LogContext.FLASHCARD, 'Set already exists, skipping', { 
                title: mongoSet.title 
              });
              totalMigrated++;
              continue;
            }

            // Create set in PowerSync
            const setId = await createFlashcardSet({
              user_id: session.user.id, // Sets ownership to current user
              title: mongoSet.title,
              description: mongoSet.description,
              is_public: mongoSet.isPublic ? 1 : 0,
              card_count: mongoSet.cardCount,
              source: mongoSet.source,
              is_deleted: 0,
            });

            // Create flashcards
            for (let i = 0; i < mongoSet.flashcards.length; i++) {
              const card = mongoSet.flashcards[i];
              await createFlashcard({
                set_id: setId,
                user_id: session.user.id,
                front: card.front,
                back: card.back,
                front_image: card.frontImage,
                back_image: card.backImage,
                order: i,
              });
            }

            totalMigrated++;
            Logger.log(LogContext.FLASHCARD, 'Set migrated successfully', { 
              title: mongoSet.title,
              totalMigrated 
            });

          } catch (err) {
            Logger.error(LogContext.FLASHCARD, 'Failed to migrate individual set', { 
              error: err,
              title: mongoSet.title 
            });
            // Continue with next set even if one fails
          }
        }

        // Check if more batches remain
        hasMore = pagination.hasMore;
        skip += limit;

        // Small delay between batches to avoid overwhelming PowerSync
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      alert(`Migration complete! ${totalMigrated} sets migrated to PowerSync.`);
      Logger.log(LogContext.FLASHCARD, 'Migration complete', { totalMigrated });

      // Refresh page to show new sets
      window.location.reload();

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setError(`Migration failed: ${errorMsg}`);
      Logger.error(LogContext.FLASHCARD, 'Migration failed', { error });
      alert(`Migration failed: ${errorMsg}`);
    } finally {
      setMigrating(false);
      setMigrationProgress({ total: 0, completed: 0, currentBatch: 0 });
    }
  };

  const filtered = flashcardSets.filter(set =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOffline = (setId: string) => offlineSets.some(s => s.set_id === setId);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-600">
          {offlineSets.length} of 10 sets available offline
        </p>
      </div>
      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search sets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border rounded-md"
        />
      </div>
      {/* Action buttons */}
      <div className="flex gap-4">
      <button onClick={migrateAllSets} className="inline-flex items-end px-4 py-2 bg-green-600 text-white rounded-md" disabled={migrating}>
        {migrating ? (
            <>
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              Migrating {migrationProgress.completed}/{migrationProgress.total}...
            </>
          ) : (
            <>
              <CloudArrowDownIcon className="h-4 w-4 mr-2" />
              Migrate All Sets
            </>
          )}
      </button>

      <Link href="/generate" className="inline-flex items-end px-4 py-2 bg-blue-600 text-white rounded-md">
        <PlusIcon className="h-4 w-4 mr-2" />
        Create Set
      </Link>
      </div>
      {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Migration Error</p>
            <p className="text-red-800">{error}</p>
          </div>
        )}
        {/* Migration progress */}
      {migrating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">Migration in Progress</p>
          <div className="mt-2 bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${migrationProgress.total > 0 
                  ? (migrationProgress.completed / migrationProgress.total) * 100 
                  : 0}%`
              }}
            />
          </div>
          <p className="text-blue-700 text-sm mt-2">
            Processing batch {migrationProgress.currentBatch} sets...
          </p>
        </div>
      )}
      {/* Sets grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(set => (
          <div key={set.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{set.title}</h3>
                {set.description && <p className="text-sm text-gray-500 mt-1">{set.description}</p>}
                <p className="text-sm text-gray-500 mt-2">{set.card_count} cards</p>
              </div>
              <button
                onClick={() => handleToggle(set.id)}
                className={`p-2 rounded-full ${
                  isOffline(set.id)
                    ? 'text-green-600 bg-green-100'
                    : 'text-gray-400 bg-gray-100'
                }`}
                title={isOffline(set.id) ? 'Remove from offline' : 'Add to offline'}
              >
                {isOffline(set.id) ? (
                  <CloudArrowDownIcon className="h-5 w-5" />
                ) : (
                  <CloudArrowUpIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <button
              onClick={() => handleStudyClick(set.id)}
              className="mt-4 block w-full text-center px-3 py-2 bg-blue-600 text-white rounded-md"
            >
              Study
            </button>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No flashcard sets found</p>
          <Link
            href="/generate"
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Your First Set
          </Link>
        </div>
      )}
    </div>
  );
}