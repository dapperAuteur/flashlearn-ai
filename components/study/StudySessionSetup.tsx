// components/study/StudySessionSetup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { List } from '@/models/List';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import CsvImportModal from '../flashcards/CsvImportModal';

export default function StudySessionSetup() {
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [studyMode, setStudyMode] = useState<'regular' | 'review'>('regular');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [dueCards, setDueCards] = useState({ new: 0, review: 0, total: 0 });

  console.log('/components/study/StudySessionSetup.tsx: 20 selectedListId :>> ', selectedListId);
  // Fetch user's lists and due cards
  const fetchData = async () => {
    try {
      let reviewQueueUrl = '/api/study/review-queue';
      if (selectedListId) {
        console.log('/components/study/StudySessionSetup.tsx: 26 selectedListId :>> ', selectedListId);
        reviewQueueUrl += `?listId=${selectedListId}`;
      }
        const [listsResponse, dueResponse] = await Promise.all([
          fetch('/api/lists'),
          fetch(reviewQueueUrl)
        ]);
        if (!listsResponse.ok) throw new Error('Failed to fetch lists');
        const listsData = await listsResponse.json();
        setLists(listsData);

        if (!dueResponse.ok) throw new Error('Failed to fetch due cards');
        const dueData = await dueResponse.json();
        console.log('/components/study/StudySessionSetup.tsx: 39 dueData :>> ', dueData);
        setDueCards({
          new: dueData.summary.newCards,
          review: dueData.summary.reviewCards,
          total: dueData.summary.totalDue
        });

      } catch (error) {
        setError('Failed to load lists. Please try again.');
        console.error('Error fetching lists:', error);
      }
  }
  useEffect(() => {
    fetchData();
  }, [selectedListId]);

  const handleStartSession = async () => {
    if (studyMode === 'regular' && !selectedListId) {
      setError('Please select a list to study');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const endpoint = studyMode === 'review' 
        ? '/api/study/sessions?mode=review' 
        : '/api/study/sessions';
      
      const body = studyMode === 'review' 
        ? { mode: 'review', listId: selectedListId || undefined }
        : { listId: selectedListId };
      
      Logger.log(LogContext.STUDY, "Setup starting study session", {
        mode: studyMode,
        listId: selectedListId || 'all'
      });
      
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start study session');
      }
      
      const data = await response.json();
      
      
      Logger.log(LogContext.STUDY, "Study session setup started", {
        mode: studyMode,
        sessionId: data.sessionId
      });

      router.push(`/dashboard/study/session/${data.sessionId}?mode=${studyMode}`);
                  
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start session';
      setError(message);
      Logger.error(LogContext.STUDY, `Error starting study session: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSuccess = () => {
    fetchData(); // Refresh the lists and dueCards
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-300">Study Session</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Study Mode Selection */}
      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-300">
          Study Mode
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setStudyMode('regular')}
            className={`p-4 rounded-md border ${
              studyMode === 'regular'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <div className="font-medium">Regular Study</div>
            <div className="text-sm mt-1">Study all cards in a list</div>
          </button>
          
          <button
            onClick={() => setStudyMode('review')}
            className={`p-4 rounded-md border ${
              studyMode === 'review'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <div className="font-medium">Smart Review</div>
            <div className="text-sm mt-1">
              {dueCards.total > 0 
                ? `${dueCards.total} cards due (${dueCards.new} new, ${dueCards.review} reviews)`
                : 'Spaced repetition review'
              }
            </div>
          </button>
        </div>
      </div>
      
      {/* List Selection */}
      <div className="mb-6">
        <label htmlFor="listSelect" className="block mb-2 text-sm font-medium text-gray-300">
          {studyMode === 'review' ? 'Filter by List (Optional)' : 'Select a List to Study'}
        </label>
        <select
          id="listSelect"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={selectedListId}
          onChange={(e) => setSelectedListId(e.target.value)}
          disabled={studyMode === 'review' && lists.length === 0}
        >
          <option value="">
            {studyMode === 'review' ? '-- All Lists --' : '-- Select a List --'}
          </option>
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
          disabled={isLoading || (studyMode === 'regular' && !selectedListId)}
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