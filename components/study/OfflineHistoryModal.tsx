'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getStudyHistory, StudySessionHistory } from '@/lib/db/indexeddb';
import { XMarkIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onViewSession: (sessionId: string) => void;
}

export default function OfflineHistoryModal({ isOpen, onClose, onViewSession }: Props) {
  const [history, setHistory] = useState<StudySessionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { status } = useSession();

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      // Try IndexedDB first
      const localData = await getStudyHistory(50);
      if (localData.length > 0) {
        setHistory(localData);
        return;
      }

      // Fallback to server API if IndexedDB is empty and user is authenticated
      if (status === 'authenticated' && navigator.onLine) {
        try {
          const res = await fetch('/api/study/history?limit=50');
          if (res.ok) {
            const data = await res.json();
            const serverHistory: StudySessionHistory[] = (data.sessions || []).map((s: { sessionId: string; setId: string; setName: string; startTime: string; endTime?: string; totalCards: number; correctCount: number; incorrectCount: number; accuracy: number; studyDirection?: string }) => ({
              sessionId: s.sessionId,
              setId: s.setId,
              setName: s.setName,
              startTime: new Date(s.startTime),
              endTime: s.endTime ? new Date(s.endTime) : undefined,
              totalCards: s.totalCards,
              correctCount: s.correctCount,
              incorrectCount: s.incorrectCount,
              accuracy: s.accuracy,
              durationSeconds: 0,
              isOfflineSession: false,
              studyDirection: s.studyDirection || 'front-to-back',
            }));
            setHistory(serverHistory);
            return;
          }
        } catch {
          // Server fetch failed, show empty state
        }
      }

      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Study History</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No study history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((session) => (
                <div
                  key={session.sessionId}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    onViewSession(session.sessionId);
                    onClose();
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{session.setName}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(session.startTime).toLocaleDateString()} at{' '}
                        {new Date(session.startTime).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="h-5 w-5 mr-1" />
                        <span className="font-medium">{session.accuracy.toFixed(0)}%</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {session.correctCount}/{session.totalCards} cards
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}