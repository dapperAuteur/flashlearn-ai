'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { List } from '@/models/List';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import CsvImportModal from '../flashcards/CsvImportModal';
import { useStudySession } from '@/contexts/StudySessionContext';
import SignUpModal from '@/components/ui/SignUpModal';
import clsx from 'clsx';

export default function StudySessionSetup() {
  const { startSession, isLoading, studyDirection, setStudyDirection } = useStudySession();
  const { status } = useSession();

  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

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
    
    await startSession(selectedListId, studyDirection);
  };

  const handleDirectionChange = (direction: 'front-to-back' | 'back-to-front') => {
    // If user is not logged in and clicks the premium feature...
    if (status !== 'authenticated' && direction === 'back-to-front') {
      // ...show the sign-up modal instead of changing the state.
      setShowSignUpModal(true);
      Logger.log(LogContext.STUDY, "Unauthenticated user clicked premium feature upsell.");
    } else {
      // Otherwise, update the direction as normal.
      setStudyDirection(direction);
    }
  };

  const handleImportSuccess = () => {
    fetchLists(); // Refresh the lists after a successful import.
  };

  return (
    <>
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
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-300">
            Study Direction
          </label>
          <div className="flex w-full rounded-md bg-gray-700 p-1">
            <button
              onClick={() => handleDirectionChange('front-to-back')}
              className={clsx(
                'w-1/2 rounded py-2 text-sm font-semibold transition-colors',
                studyDirection === 'front-to-back' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'
              )}
            >
              Front → Back
            </button>
            <button
              onClick={() => handleDirectionChange('back-to-front')}
              className={clsx(
                'w-1/2 rounded py-2 text-sm font-semibold transition-colors',
                studyDirection === 'back-to-front' ? 'bg-blue-600 text-white' : 'text-gray-300',
                // If not authenticated, apply disabled styles and show a lock icon
                status !== 'authenticated' && 'opacity-60 cursor-not-allowed flex items-center justify-center'
              )}
            >
              Back → Front
              {status !== 'authenticated' && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-2">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
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
      <SignUpModal isOpen={showSignUpModal} onClose={() => setShowSignUpModal(false)} />
    </>
  );
}