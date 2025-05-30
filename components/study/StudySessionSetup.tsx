// components/study/StudySessionSetup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { List } from '@/models/List';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import CsvImportModal from '../flashcards/CsvImportModal';
import { DueCard, DueData, ListWithDueCards } from '@/types/flashcard';

export default function StudySessionSetup() {
  const router = useRouter();
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [studyMode, setStudyMode] = useState<'regular' | 'review'>('regular');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [dueCards, setDueCards] = useState({ new: 0, review: 0, total: 0 });
  const [dueData, setDueData] = useState<DueData>({
    cards: [] as DueCard[],
    summary: {
      newCards: 0,
      reviewCards: 0,
      totalDue: 0
    }
  })

  // Process dueData to get lists with due cards and their counts
  const getListsWithDueCards = (): ListWithDueCards[] => {
    Logger.log(LogContext.STUDY, "Processing due cards data", {
      totalCards: dueData.cards?.length || 0,
      summary: dueData.summary,
      lists: lists.length,
      listName: lists[0].name
    });

    if (!dueData.cards || dueData.cards.length === 0) return [];
    
    // Group cards by listId and count them, also find earliest review date
    const listInfo = dueData.cards.reduce((acc, card) => {
      const listId = card.listId;
      if (!acc[listId]) {
        acc[listId] = { 
          count: 0, 
          earliestReview: card.nextReviewDate ? new Date(card.nextReviewDate) : new Date()
        };
      }
      acc[listId].count++;
      
      // Track earliest review date for sorting
      if (card.nextReviewDate) {
        const cardReviewDate = new Date(card.nextReviewDate);
        if (cardReviewDate < acc[listId].earliestReview) {
          acc[listId].earliestReview = cardReviewDate;
        }
      }
      
      return acc;
    }, {} as Record<string, { count: number; earliestReview: Date }>);
    
    // Filter lists to only those with due cards and add due count info
    return lists
      .filter(list => list._id && listInfo[list._id.toString()])
      .map(list => ({
        ...list,
        dueCount: listInfo[list._id!.toString()].count,
        nextReviewDate: listInfo[list._id!.toString()].earliestReview
      }))
      .sort((a, b) => {
        // Sort by earliest review date (most urgent first)
        if (a.nextReviewDate && b.nextReviewDate) {
          return a.nextReviewDate.getTime() - b.nextReviewDate.getTime();
        }
        return 0;
      });
  };

  // Fetch user's lists and due cards
  const fetchData = async () => {
    try {
      Logger.log(LogContext.STUDY, "Fetching lists and due cards data", {
        studyMode,
        selectedListId
      });
      
      // Always fetch all lists first
      const listsResponse = await fetch('/api/lists');
      if (!listsResponse.ok) throw new Error('Failed to fetch lists');
      const listsData = await listsResponse.json();
      setLists(listsData);

      // Fetch due cards (don't filter by listId for review mode)
      const reviewQueueUrl = '/api/study/review-queue';
      const dueResponse = await fetch(reviewQueueUrl);

      if (!dueResponse.ok) throw new Error('Failed to fetch due cards');
      const dueCardsData = await dueResponse.json();

      Logger.log(LogContext.STUDY, "Due cards data fetched", {
        totalCards: dueCardsData.cards?.length || 0,
        newCards: dueCardsData.summary.newCards,
        reviewCards: dueCardsData.summary.reviewCards,
        totalDue: dueCardsData.summary.totalDue,
        summary: dueCardsData.summary
      });

      setDueData(dueCardsData);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
        setError('Failed to load lists. Please try again.');
        Logger.error(LogContext.STUDY, `Error fetching data: ${errorMessage}`);
      }
  };
  useEffect(() => {
    fetchData();
  }, []);

  const handleStartSession = async () => {
    Logger.log(LogContext.STUDY, "Starting study session", {
      studyMode,
      selectedListId
    });

    if (studyMode === 'regular' && !selectedListId) {
      setError('Please select a list to study');
      return;
    }

    if (studyMode === 'review' && !selectedListId) {
      setError('Please select a list to review');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const endpoint = '/api/study/sessions';
      const body = studyMode === 'review' 
        ? { mode: 'review', listId: selectedListId }
        : { listId: selectedListId };
      
      Logger.log(LogContext.STUDY, "Setup starting study session", {
        mode: studyMode,
        listId: selectedListId
      });
      
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const data = await response.json();
        Logger.error(LogContext.STUDY, `Setup Error starting study session: ${data.error}`, {
          mode: studyMode,
          listId: selectedListId,
          sessionId: data.sessionId
        });
        throw new Error(data.error || 'Setup Failed to start study session');
      }
      
      const data = await response.json();
      
      
      Logger.log(LogContext.STUDY, "Study session setup started", {
        mode: studyMode,
        sessionId: data.sessionId
      });

      router.push(`/dashboard/study/session/${data.sessionId}?mode=${studyMode}`);
                  
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Setup Failed to start session';
      setError(message);
      Logger.error(LogContext.STUDY, `Setup Error starting study session: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSuccess = () => {
    fetchData(); // Refresh the lists and dueCards
  }

  // Get the appropriate lists to show in dropdown
  const getDisplayLists = () => {
    if (studyMode === 'review') {
      return getListsWithDueCards();
    }
    return lists;
  };

  const displayLists = getDisplayLists();

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
            onClick={
              () => {
                setStudyMode('regular');
                setSelectedListId(''); // Reset selection when changing modes
              }
            }
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
            onClick={
              () => {
                setStudyMode('review');
                setSelectedListId(''); // Reset selection when changing modes
              }
            }
            className={`p-4 rounded-md border ${
              studyMode === 'review'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <div className="font-medium">Smart Review</div>
            <div className="text-sm mt-1">
              {dueData.summary.totalDue > 0 
                ? `${dueData.summary.totalDue} cards due (${dueData.summary.newCards} new, ${dueData.summary.reviewCards} reviews)`
                : 'Spaced repetition review'
              }
            </div>
          </button>
        </div>
      </div>
      
      {/* List Selection */}
      <div className="mb-6">
        <label htmlFor="listSelect" className="block mb-2 text-sm font-medium text-gray-300">
          {studyMode === 'review' ? 'Select a List to Review' : 'Select a List to Study'}
        </label>
        <select
          id="listSelect"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={selectedListId}
          onChange={(e) => setSelectedListId(e.target.value)}
          disabled={displayLists.length === 0}
          required
        >
          <option value="">
            {studyMode === 'review' ? '-- Select a List to Review --' : '-- Select a List --'}
          </option>
          {displayLists.map((list) => {
            const listId = list._id?.toString() || '';
            if (studyMode === 'review') {
              const reviewList = list as ListWithDueCards;
              const reviewDate = reviewList.nextReviewDate 
                ? new Date(reviewList.nextReviewDate).toLocaleDateString()
                : 'Now';
              return (
                <option key={listId} value={listId}>
                  {list.name} ({reviewList.dueCount} due - Review by {reviewDate})
                </option>
              );
            } else {
              return (
                <option key={listId} value={listId}>
                  {list.name} ({list.cardCount} cards)
                </option>
              );
            }
          })}
        </select>
        {studyMode === 'review' && displayLists.length === 0 && (
          <p className="mt-2 text-sm text-gray-400">
            No cards are due for review at this time.
          </p>
        )}
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