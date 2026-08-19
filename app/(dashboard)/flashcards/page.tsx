'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardManager from '@/components/flashcards/FlashcardManager';
import OfflineHistoryModal from '@/components/study/OfflineHistoryModal';
import { ChartBarIcon } from '@heroicons/react/24/outline';

export default function FlashcardsPage() {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const router = useRouter();

  const handleStartStudy = (setId: string) => {
    router.push(`/study?setId=${setId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Flashcards</h1>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            History
          </button>
        </div>

        {/* Content */}
        <FlashcardManager onStartStudy={handleStartStudy} isLoading={false} />

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
