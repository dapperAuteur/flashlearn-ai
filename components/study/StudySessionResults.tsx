'use client';

import { useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Logger, LogContext } from '@/lib/logging/client-logger';
// NEW: Import the custom hook
import { useStudySession } from '@/contexts/StudySessionContext';

// REMOVED: The props interface is no longer needed as data will come from context.
// interface StudySessionResultsProps { ... }

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StudySessionResults() {
  // NEW: Connect to the context to get results data and the reset action.
  const { sessionId, flashcards, cardResults, resetSession } = useStudySession();

  // Create the results object based on the data from the context.
  const results = {
    sessionId: sessionId || 'unknown',
    totalCards: flashcards.length,
    completedCards: cardResults.length,
    correctCount: cardResults.filter(r => r.isCorrect).length,
    incorrectCount: cardResults.filter(r => !r.isCorrect).length,
    accuracy: cardResults.length > 0 ? (cardResults.filter(r => r.isCorrect).length / cardResults.length) * 100 : 0,
    durationSeconds: Math.round(cardResults.reduce((total, r) => total + r.timeSeconds, 0)),
  };

  useEffect(() => {
    // This logging logic remains valuable.
    Logger.log(
      LogContext.STUDY,
      `Study session results displayed for session ID: ${results.sessionId}`,
      { ...results }
    );
  }, [results.sessionId]); // Depend on sessionId from the results object

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) {
      Logger.error(LogContext.STUDY, 'Invalid duration value received.', { seconds });
      return '0m 0s';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const chartData = {
    labels: ['Correct', 'Incorrect'],
    datasets: [
      {
        data: [results.correctCount, results.incorrectCount],
        backgroundColor: ['#10B981', '#EF4444'],
        borderColor: ['#059669', '#DC2626'],
        borderWidth: 1,
      },
    ],
  };

  const handleResetClick = () => {
    Logger.log(
      LogContext.STUDY,
      `User clicked 'Study Another Set' after session ID: ${results.sessionId}`
    );
    // MODIFIED: Call the reset function directly from the context.
    resetSession();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Session Complete!</h2>
      <p className="text-gray-600 mb-8 text-center">Here&apos;s how you did:</p>
      {/* The rest of the JSX remains the same */}
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
      <div className="mt-8 text-center">
        <button
          onClick={handleResetClick}
          className="w-full sm:w-auto py-3 px-8 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Study Another Set
        </button>
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