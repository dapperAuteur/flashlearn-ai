// app/study/results/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  AcademicCapIcon,
  CloudIcon,
  ComputerDesktopIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { getStudyHistory, StudySessionHistory } from '@/lib/db/indexeddb';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export default function StudyResultsPage() {
  const [studyHistory, setStudyHistory] = useState<StudySessionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudyHistory();
  }, []);

  const loadStudyHistory = async () => {
    try {
      const history = await getStudyHistory(20); // Get more results
      setStudyHistory(history);
      Logger.log(LogContext.STUDY, 'Study history loaded', { count: history.length });
    } catch (error) {
      Logger.error(LogContext.STUDY, 'Failed to load study history', { error });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(date));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/flashcards"
            className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Study
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Study History</h1>
          <p className="mt-2 text-gray-600">Your recent study sessions</p>
        </div>

        {studyHistory.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No study sessions yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Complete a study session to see your results here.
            </p>
            <div className="mt-6">
              <Link
                href="/study"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Start Studying
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {studyHistory.map((session) => (
              <Link
                key={session.sessionId}
                href={`/study/results/${session.sessionId}`}
                className="block"
              >
                <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {session.setName}
                        </h3>
                        {session.isOfflineSession ? (
                          <ComputerDesktopIcon 
                            className="h-5 w-5 text-orange-500" 
                            title="Offline session"
                          />
                        ) : (
                          <CloudIcon 
                            className="h-5 w-5 text-blue-500" 
                            title="Online session"
                          />
                        )}
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarDaysIcon className="h-4 w-4 mr-1" />
                          {formatDate(session.startTime)}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {formatDuration(session.durationSeconds)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {session.accuracy.toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-500">accuracy</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-md">
                      <div className="text-lg font-semibold text-gray-900">
                        {session.totalCards}
                      </div>
                      <div className="text-sm text-gray-500">Total</div>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded-md">
                      <div className="text-lg font-semibold text-green-600">
                        {session.correctCount}
                      </div>
                      <div className="text-sm text-green-600">Correct</div>
                    </div>
                    
                    <div className="text-center p-3 bg-red-50 rounded-md">
                      <div className="text-lg font-semibold text-red-600">
                        {session.incorrectCount}
                      </div>
                      <div className="text-sm text-red-600">Incorrect</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}