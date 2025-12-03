 'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { useStudySession } from '@/contexts/StudySessionContext';
import { Skeleton } from '@/components/ui/skeleton';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StudySessionResults() {
  const params = useParams();
  const sessionIdFromUrl = params.sessionId as string;

  const {
    sessionId,
    flashcards,
    cardResults,
    flashcardSetName,
    loadSessionResults,
    isLoading,
    error,
  } = useStudySession();

  Logger.info(LogContext.STUDY, "StudySessionResults state", {
    sessionId,
    flashcards,
    cardResults,
    flashcardSetName,
  })

  useEffect(() => {
    // On page load/refresh, if the context's session ID doesn't match the URL,
    // it means we need to load the data from IndexedDB.
    if (sessionIdFromUrl && sessionId !== sessionIdFromUrl) {
      loadSessionResults(sessionIdFromUrl);
    }
  }, [sessionId, sessionIdFromUrl, loadSessionResults]);

  const results = useMemo(() => ({
    sessionId: sessionId || 'unknown-session',
    totalCards: flashcards.length,
    completedCards: cardResults.length,
    correctCount: cardResults.filter(r => r.isCorrect).length,
    incorrectCount: cardResults.filter(r => !r.isCorrect).length,
    accuracy: cardResults.length > 0
      ? (cardResults.filter(r => r.isCorrect).length / cardResults.length) * 100
      : 0,
    durationSeconds: Math.round(cardResults.reduce((total, result) => total + result.timeSeconds, 0)),
  }), [sessionId, flashcards, cardResults]);

  useEffect(() => {
    if (results.sessionId !== 'unknown-session' && !isLoading) {
      Logger.log(
        LogContext.STUDY,
        `Study session results displayed for session ID: ${results.sessionId}`,
        { ...results }
      );
    }
  }, [results, isLoading]);

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) {
      return '0m 0s';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (isLoading || (sessionId !== sessionIdFromUrl && !error)) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <Skeleton className="h-12 w-1/2 mx-auto mb-2" />
        <Skeleton className="h-6 w-3/4 mx-auto mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 p-4 rounded-lg">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
          <div>
            <Skeleton className="h-8 w-32 mb-4" />
            <div className="w-full max-w-xs mx-auto">
              <Skeleton className="h-64 w-64 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: ['Correct', 'Incorrect'],
    datasets: [{
      data: [results.correctCount, results.incorrectCount],
      backgroundColor: ['#10B981', '#EF4444'],
      borderColor: ['#059669', '#DC2626'],
      borderWidth: 1,
    }],
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Session Complete!</h2>
      <p className="text-gray-600 mb-8 text-center">Results for: <span className="font-semibold">{flashcardSetName}</span></p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Accuracy" value={`${results.accuracy.toFixed(0)}%`} color="text-blue-600" />
          <StatCard label="Correct" value={results.correctCount} color="text-green-600" />
          <StatCard label="Incorrect" value={results.incorrectCount} color="text-red-600" />
          <StatCard label="Total Cards" value={`${results.completedCards}/${results.totalCards}`} />
          <StatCard label="Total Time" value={formatDuration(results.durationSeconds)} />
          <StatCard label="Avg. Time" value={`${formatDuration(results.completedCards > 0 ? results.durationSeconds / results.completedCards : 0)}/card`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Performance</h3>
          <div className="w-full max-w-xs mx-auto">
            <Doughnut data={chartData} />
          </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ label, value, color = 'text-gray-800' }: { label: string, value: string | number, color?: string }) => (
  <div className="bg-gray-100 p-4 rounded-lg text-center sm:text-left">
    <p className="text-sm text-gray-500">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);