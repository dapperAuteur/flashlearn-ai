/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useFlashcards } from '@/contexts/FlashcardContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useStudySession } from '@/contexts/StudySessionContext';
import { useMigration } from '@/hooks/useMigration';
import { useSession } from 'next-auth/react';
import { LogContext, Logger } from '@/lib/logging/client-logger';

interface Props {
  onStartStudy: (setId: string) => void;
}

export default function FlashcardManager({ onStartStudy }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const { startSession } = useStudySession();
  const { flashcardSets, offlineSets, toggleOfflineAvailability } = useFlashcards();
  const { migrating, error: migrationError, migrationProgress, migrateAllSets } = useMigration();
  const [searchTerm, setSearchTerm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // DEBUG: Check what we're getting
  console.log('FlashcardManager - flashcardSets:', flashcardSets);
  console.log('FlashcardManager - session user:', session?.user?.id);
  console.log('FlashcardManager - offlineSets:', offlineSets);

  // Add this handler
  const handleStudyClick = async (setId: string) => {
    try {
      setLocalError(null);
      await startSession(setId, 'front-to-back');
      onStartStudy(setId); // Trigger view change
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to start session');
    }
  };


  const handleToggle = async (setId: string) => {
  try {
    setLocalError(null);
    await toggleOfflineAvailability(setId);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to toggle offline');
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
          className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:border-blue-500 text-gray-900"
        />
      </div>
      {/* Action buttons */}
      <div className="flex gap-4">
      <button onClick={() => migrateAllSets()} className="inline-flex items-end px-4 py-2 bg-green-600 text-white rounded-md" disabled={migrating}>
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
      {/* Error display for local component errors */}
        {localError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{localError}</p>
          </div>
        )}
        {migrationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Migration Error</p>
            <p className="text-red-800">{migrationError}</p>
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
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filtered.map(set => (
          <div key={set.id} className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{set.title}</h3>
                {set.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{set.description}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">{set.card_count} cards</p>
              </div>
              <button
                onClick={() => handleToggle(set.id)}
                className={`p-2 rounded-full flex-shrink-0 ${
                  isOffline(set.id)
                    ? 'text-green-600 bg-green-100'
                    : 'text-gray-400 bg-gray-100'
                }`}
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
              className="mt-4 block w-full text-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Study
            </button>
          </div>
        ))}
    </div> */}
    </div>
    
  );
}