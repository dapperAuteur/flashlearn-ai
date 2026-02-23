'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardManager from '@/components/flashcards/FlashcardManager';
import OfflineHistoryModal from '@/components/study/OfflineHistoryModal';
import { useMigration } from '@/hooks/useMigration';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { useSession } from 'next-auth/react';
import { useFlashcards } from '@/contexts/FlashcardContext';
import { useToast } from '@/hooks/use-toast';

export default function FlashcardsPage() {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const router = useRouter();

  const { flashcardSets } = useFlashcards();
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const { migrateAllSets } = useMigration();

  useEffect(() => {
    const hasMigrated = sessionStorage.getItem('autoMigrated');

    if (hasMigrated || status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    if (flashcardSets.length === 0) {
      Logger.log(LogContext.FLASHCARD, 'No local sets found. Triggering automatic migration...');

      toast({
        title: 'Syncing your account',
        description: 'Please wait while we fetch your flashcard sets...',
      });

      sessionStorage.setItem('autoMigrated', 'true');

      migrateAllSets({
        onComplete: () => {
          Logger.log(LogContext.FLASHCARD, 'Automatic migration complete.');
          toast({
            title: 'Sync Complete',
            description: 'Your flashcard sets are all up to date.',
          });
        },
        onError: (error: unknown) => {
           Logger.error(LogContext.FLASHCARD, 'Auto-migration failed', { error });
           toast({
             variant: 'destructive',
             title: 'Sync Failed',
             description: 'Could not fetch your sets. Please try clearing the local cache or refreshing.',
           });
           sessionStorage.removeItem('autoMigrated');
        }
      });

    } else {
      Logger.log(LogContext.FLASHCARD, 'Local sets found. Skipping automatic migration.');
      sessionStorage.setItem('autoMigrated', 'true');
    }
  }, [migrateAllSets, flashcardSets.length, status, session, toast]);

  const handleStartStudy = (setId: string) => {
    router.push(`/study?setId=${setId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-600">My Flashcards</h1>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            History
          </button>
        </div>

        {/* Content */}
        <FlashcardManager onStartStudy={handleStartStudy} sets={[]} isLoading={false} />

        <OfflineHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          onViewSession={() => {
            setShowHistoryModal(false);
          }}
        />
      </div>
    </div>
  );
}