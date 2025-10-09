'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStudyHistory, StudySessionHistory } from '@/lib/db/indexeddb';
import { getResults, CardResult } from '@/lib/db/indexeddb';
import ShareableResultsCard from '@/components/study/ShareableResultsCard';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import Link from 'next/link';
import { ArrowLeftIcon, PlayIcon } from 'lucide-react';

export default function StudyResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<StudySessionHistory | null>(null);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);

  useEffect(() => {
    const loadResults = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        Logger.log(LogContext.STUDY, "Loading session results", { sessionId });

        // Wait a moment for IndexedDB to finish writing
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get session history
        const history = await getStudyHistory(100);
        const session = history.find(s => s.sessionId === sessionId);

        if (!session) {
          Logger.warning(LogContext.STUDY, "Session not found in history", { 
            sessionId,
            availableSessions: history.map(s => s.sessionId)
          });
          setError('Session results not found. They may still be processing.');
          setLoading(false);
          return;
        }

        // Get card results
        const results = await getResults(sessionId);

        Logger.log(LogContext.STUDY, "Session results loaded", {
          sessionId,
          cardCount: results.length,
          hasConfidenceData: results.some(r => r.confidenceRating !== undefined)
        });

        setSessionData(session);
        setCardResults(results);
        setLoading(false);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        Logger.error(LogContext.STUDY, "Failed to load session results", { 
          error: err,
          sessionId 
        });
        setError(`Failed to load results: ${errorMsg}`);
        setLoading(false);
      }
    };

    loadResults();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Results Not Found</h2>
            <p className="mt-2 text-gray-600">
              {error || 'We couldn\'t find the results for this study session.'}
            </p>
            <div className="mt-6 space-x-4">
              <button
                onClick={() => router.push('/study')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start New Session
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/study/results"
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 shadow-sm border border-gray-200 transition-all"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            View All Results
          </Link>
          
          <Link
            href="/study"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Start Another Session
          </Link>
        </div>
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
      </div>
    </div>
  );
}