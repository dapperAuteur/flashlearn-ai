// components/study/StudySessionSetup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { List } from '@/models/List';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import CsvImportModal from '../flashcards/CsvImportModal';

interface StudySessionSetupProps {
  onStartSession: (sessionId: string, flashcards: any[]) => void;
}

export default function StudySessionSetup({ onStartSession }: StudySessionSetupProps) {
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Fetch user's lists
  const fetchLists = async () => {
    try {
        const response = await fetch('/api/lists');
        if (!response.ok) throw new Error('Failed to fetch lists');
        const data = await response.json();
        console.log('StudySessionSetup data :>> ', data);
        setLists(data);
      } catch (error) {
        setError('Failed to load lists. Please try again.');
        console.error('Error fetching lists:', error);
      }
  }
  useEffect(() => {
    fetchLists();
  }, []);

  const handleStartSession = async () => {
    if (!selectedListId) {
      setError('Please select a list to study');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      Logger.log(LogContext.STUDY, "Starting study session", { listId: selectedListId });
      
      const response = await fetch('/api/study/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId: selectedListId })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start study session');
      }
      
      const data = await response.json();
      
      // Pass session ID and flashcards to parent component
      onStartSession(data.sessionId, data.flashcards);
      Logger.log(LogContext.STUDY, "Study session started", { sessionId: data.sessionId });

      // route to http://localhost:3000/dashboard/study/sessions/[id]
      router.push(`/dashboard/study/session/${data.sessionId}`);
                  
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start session';
      setError(message);
      Logger.error(LogContext.STUDY, `Error starting study session: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSuccess = () => {
    fetchLists(); // Refresh the lists
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Study Session</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <label htmlFor="listSelect" className="block mb-2 text-sm font-medium text-gray-300">
          Select a List to Study
        </label>
        <select
          id="listSelect"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={selectedListId}
          onChange={(e) => setSelectedListId(e.target.value)}
        >
          <option value="">-- Select a List --</option>
          {lists.map((list) => (
            <option key={list._id?.toString()} value={list._id?.toString()}>
              {list.name} ({list.cardCount} cards)
            </option>
          ))}
        </select>
      </div>

      <div className='mb-6'>
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="w-full px-4 py-2 border border-gray-300 text-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Import New List from CSV
        </button>
      </div>

      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleStartSession}
          disabled={isLoading || !selectedListId}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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