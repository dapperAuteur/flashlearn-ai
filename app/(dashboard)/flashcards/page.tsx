/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import FlashcardManager from '@/components/flashcards/FlashcardManager';
import StudySessionManager from '@/components/study/StudySessionManager';
import StudySessionResults from '@/components/study/StudySessionResults';
import OfflineHistoryModal from '@/components/study/OfflineHistoryModal';
import { useStudySession } from '@/contexts/StudySessionContext';
import { ChartBarIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

type ViewMode = 'list' | 'study' | 'results' | 'history';

export default function FlashcardsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const { sessionId, isComplete, resetSession } = useStudySession();

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
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Sets
            </button>
          ) : (
            <h1 className="text-2xl md:text-3xl font-bold">My Flashcards</h1>
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
          <FlashcardManager onStartStudy={handleStartStudy} />
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
          onViewSession={(sessionId: string) => {
            setShowHistoryModal(false);
            setViewMode('results');
          }}
        />
      </div>
    </div>
  );
}