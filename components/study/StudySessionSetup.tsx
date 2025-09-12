'use client';

import { useState, useEffect } from 'react';
import { List } from '@/models/List';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import CsvImportModal from '../flashcards/CsvImportModal';
// NEW: Import the custom hook to access our context
import { useStudySession } from '@/contexts/StudySessionContext';

// REMOVED: The onStartSession prop is no longer needed.
// interface StudySessionSetupProps {
//   onStartSession: (sessionId: string, cards: Flashcard[]) => void;
// }

// The component no longer accepts any props.
export default function StudySessionSetup() {
  // NEW: Connect to the context to get the startSession action and loading state.
  const { startSession, isLoading } = useStudySession();

  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchLists = async () => {
    // This data fetching logic remains the same.
    try {
      const response = await fetch('/api/lists');
      if (!response.ok) throw new Error('Failed to fetch lists');
      const data = await response.json();
      setLists(data);
    } catch (error) {
      setError('Failed to load lists. Please try again.');
      Logger.error(LogContext.STUDY, 'Error fetching lists in StudySessionSetup', { error });
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleStartSession = async () => {
    if (!selectedListId) {
      setError('Please select a list to study');
      return;
    }
    setError(null);
    // MODIFIED: Instead of calling a prop, we call the startSession function
    // directly from our context. All the complex logic is now handled there.
    await startSession(selectedListId);
  };

  const handleImportSuccess = () => {
    fetchLists(); // Refresh the lists after a successful import.
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-white">Choose a Set to Study</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="listSelect" className="block mb-2 text-sm font-medium text-gray-300">
          Select a List
        </label>
        <select
          id="listSelect"
          className="w-full p-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={selectedListId}
          onChange={(e) => setSelectedListId(e.target.value)}
        >
          <option value="">-- Select a List --</option>
          {lists.map((list) => (
            <option key={list._id?.toString()} value={list._id?.toString()}>
              {list.title} ({list.cardCount} cards)
            </option>
          ))}
        </select>
      </div>

      <div className='mb-6'>
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="w-full px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Import New List from CSV
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleStartSession}
          disabled={isLoading || !selectedListId}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Starting...' : 'Start Studying'}
        </button>
      </div>

      <CsvImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}