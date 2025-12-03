 /* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState, useCallback } from 'react';
import FlashcardManager from '@/components/flashcards/FlashcardManager';
import StudySessionManager from '@/components/study/StudySessionManager';
import StudySessionResults from '@/components/study/StudySessionResults';
import OfflineHistoryModal from '@/components/study/OfflineHistoryModal';
import { useStudySession } from '@/contexts/StudySessionContext';
import { useMigration } from '@/hooks/useMigration';
import { ChartBarIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { useSession } from 'next-auth/react';
import { useFlashcards } from '@/contexts/FlashcardContext';
import { useToast } from '@/hooks/use-toast';


type ViewMode = 'list' | 'study' | 'results' | 'history';

export default function FlashcardsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const { flashcardSets } = useFlashcards(); 
  const { toast } = useToast();
  const { data: session, status } = useSession(); // Get auth status
  const { migrateAllSets } = useMigration();

  const { sessionId, isComplete, resetSession } = useStudySession();

  useEffect(() => {
    // Check if migration has already run *this session*
    const hasMigrated = sessionStorage.getItem('autoMigrated');

    // Wait for auth and ensure we only run once
    if (hasMigrated || status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    // If local DB is empty, trigger migration
    if (flashcardSets.length === 0) {
      Logger.log(LogContext.FLASHCARD, 'No local sets found. Triggering automatic migration...');
      
      // Notify user migration is starting
      toast({
        title: 'Syncing your account',
        description: 'Please wait while we fetch your flashcard sets...',
      });

      // Mark as "migrated" in session storage immediately
      sessionStorage.setItem('autoMigrated', 'true'); 

      migrateAllSets({
        onComplete: () => {
          Logger.log(LogContext.FLASHCARD, 'Automatic migration complete.');
          // Notify user migration is finished
          toast({
            title: 'Sync Complete',
            description: 'Your flashcard sets are all up to date.',
          });
        },
        onError: (error: unknown) => {
           Logger.error(LogContext.FLASHCARD, 'Auto-migration failed', { error });
           // Notify user of failure
           toast({
             variant: 'destructive',
             title: 'Sync Failed',
             description: 'Could not fetch your sets. Please try clearing the local cache or refreshing.',
           });
           // Allow migration to be tried again next time
           sessionStorage.removeItem('autoMigrated');
        }
      });

    } else {
      // If we already have sets, just mark as "migrated" to skip this check next time.
      Logger.log(LogContext.FLASHCARD, 'Local sets found. Skipping automatic migration.');
      sessionStorage.setItem('autoMigrated', 'true');
    }
  }, [
    migrateAllSets, 
    flashcardSets.length, 
    status, 
    session,
    toast // Add toast to dependency array
  ]);

  const handleStartStudy = (setId: string) => {
    setSelectedSetId(setId);
    setViewMode('study');
  };

  const handleBackToList = () => {
    resetSession();
    setViewMode('list');
    setSelectedSetId(null);
  };

  const handleViewResults = () => {
    setViewMode('results');
  };

  // Auto-transition to results when session completes
  useEffect(() => {
    if (isComplete && viewMode === 'study') {
      console.log('✅ Session complete - transitioning to results NOW');
      setViewMode('results');
    }
  }, [isComplete, viewMode]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          {viewMode !== 'list' ? (
            <button
              onClick={handleBackToList}
              className="inline-flex items-center text-gray-700 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Sets
            </button>
          ) : (
            <h1 className="text-2xl md:text-3xl font-bold text-gray-600">My Flashcards</h1>
          )}
          
          {viewMode === 'list' && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              History
            </button>
          )}
        </div>

        {/* Content */}
        {viewMode === 'list' && (
          <FlashcardManager onStartStudy={handleStartStudy} sets={[]} isLoading={false} />
        )}

        {viewMode === 'study' && (
          <StudySessionManager />
        )}

        {viewMode === 'results' && (
          <div>
            <StudySessionResults />
            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleBackToList}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Study Another Set
              </button>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                View All Results
              </button>
            </div>
          </div>
        )}

        <OfflineHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          onViewSession={() => {
            setShowHistoryModal(false);
            setViewMode('results');
          }}
        />
      </div>
    </div>
  );
}