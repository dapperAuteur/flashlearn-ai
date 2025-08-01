'use client';

import { useState, useEffect } from 'react';
import { Flashcard } from '@/types/flashcard';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import CsvImportModal from '../flashcards/CsvImportModal';

type FlashcardSet = {
  _id: string;
  name: string; // Changed from title to match your existing component
  flashcards: Flashcard[];
  cardCount: number; // Added cardCount to match your existing component
};

interface StudySessionSetupProps {
  onStartSession: (sessionId: string, cards: Flashcard[]) => void;
}

export default function StudySessionSetup({ onStartSession }: StudySessionSetupProps) {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchLists = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/lists'); // Changed to /api/lists
      if (!response.ok) {
        throw new Error('Failed to fetch your flashcard lists.');
      }
      const data = await response.json();
      setSets(data);
      Logger.log(LogContext.STUDY, 'Fetched flashcard sets', { count: data.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      Logger.error(LogContext.STUDY, 'Error fetching sets', { error: message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSet = sets.find(set => set._id === selectedSetId);
    if (selectedSet) {
        // The API call to create a session is now handled by the parent
        onStartSession(selectedSet._id, selectedSet.flashcards);
    } else {
      setError('Please select a valid set to begin.');
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Setup Your Study Session</h2>
        <p className="text-gray-600 mb-6">Choose a set to study, or import a new one.</p>
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleStart}>
          <div className="space-y-4">
            <div>
              <label htmlFor="set-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select a Flashcard Set
              </label>
              <select
                id="set-select"
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
                disabled={isLoading || sets.length === 0}
                className="w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm py-3 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  {isLoading ? 'Loading sets...' : 'Select a set'}
                </option>
                {sets.map(set => (
                  <option key={set._id} value={set._id}>{set.name} ({set.cardCount} cards)</option>
                ))}
              </select>
              {sets.length === 0 && !isLoading && (
                <p className="text-sm text-gray-500 mt-2">
                  You don&apos;t have any sets yet. Try importing one!
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Import New List from CSV
            </button>

            <button
              type="submit"
              disabled={!selectedSetId || isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Start Studying'}
            </button>
          </div>
        </form>
      </div>
      <CsvImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={fetchLists}
      />
    </>
  );
}