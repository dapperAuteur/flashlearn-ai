'use client';

import { useEffect, useState } from 'react';
import { getStudyHistory, getResults, StudySessionHistory, CardResult } from '@/lib/db/indexeddb';
import ShareableResultsCard from './ShareableResultsCard';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  sessionId: string | null;
  onClose: () => void;
}

export default function OfflineResultsModal({ sessionId, onClose }: Props) {
  const [sessionData, setSessionData] = useState<StudySessionHistory | null>(null);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    const loadResults = async () => {
      const history = await getStudyHistory(100);
      const session = history.find(s => s.sessionId === sessionId);
      if (session) {
        setSessionData(session);
        const results = await getResults(sessionId);
        setCardResults(results);
      }
    };

    loadResults();
  }, [sessionId]);

  if (!sessionId || !sessionData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-semibold">Session Results</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <ShareableResultsCard
            initialResults={{
              _id: sessionData.sessionId,
              totalCards: sessionData.totalCards,
              correctCount: sessionData.correctCount,
              incorrectCount: sessionData.incorrectCount,
              completedCards: sessionData.totalCards,
              durationSeconds: sessionData.durationSeconds,
              setName: sessionData.setName,
              startTime: sessionData.startTime,
              endTime: sessionData.endTime,
            }}
            cardResults={cardResults}
          />
          
          <div className="mt-6 flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start Another Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}