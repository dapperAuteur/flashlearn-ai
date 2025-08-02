'use client';

import { useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Logger, LogContext } from '@/lib/logging/client-logger';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface StudySessionResultsProps {
  results: {
    sessionId: string;
    totalCards: number;
    completedCards: number;
    correctCount: number;
    incorrectCount: number;
    accuracy: number;
    durationSeconds: number;
  };
  onReset: () => void;
}

export default function StudySessionResults({ results, onReset }: StudySessionResultsProps) {
  // Log the study session results when the component mounts.
  useEffect(() => {
    // This provides a comprehensive record of the user's performance for analytics.
    Logger.log(
      LogContext.STUDY,
      `Study session results displayed for session ID: ${results.sessionId}`,
      {
        sessionId: results.sessionId,
        accuracy: results.accuracy,
        correctCount: results.correctCount,
        incorrectCount: results.incorrectCount,
        durationSeconds: results.durationSeconds,
        completedCards: results.completedCards,
        totalCards: results.totalCards,
      }
    );
  }, [results]); // Dependency array ensures this logs once per result set.

  const formatDuration = (seconds: number) => {
    // If the duration is not a valid number, log an error for debugging.
    if (isNaN(seconds) || seconds < 0) {
      Logger.error(
        LogContext.STUDY,
        'Invalid duration value received in StudySessionResults',
        {
          sessionId: results.sessionId,
          invalidSecondsValue: seconds,
        }
      );
      return '0m 0s';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };
  const avgTime = results.completedCards > 0 ? results.durationSeconds / results.completedCards : 0;


  // Log viewing results
  Logger.log(LogContext.STUDY, "Viewing study session results", {
    sessionId: results.sessionId,
    accuracy: results.accuracy
  });

  // Chart data
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

  // Handles the reset button click, logging the event before proceeding.
  const handleResetClick = () => {
    Logger.log(
      LogContext.STUDY,
      `User clicked 'Study Another Set' after session ID: ${results.sessionId}`,
      { sessionId: results.sessionId }
    );
    onReset();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Session Complete!</h2>
      <p className="text-gray-600 mb-8 text-center">Here&apos;s how you did:</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4">
            <StatCard label="Accuracy" value={`${results.accuracy.toFixed(0)}%`} color="text-blue-600" />
            <StatCard label="Correct" value={results.correctCount} color="text-green-600" />
            <StatCard label="Incorrect" value={results.incorrectCount} color="text-red-600" />
            <StatCard label="Total Cards" value={`${results.completedCards}/${results.totalCards}`} />
            <StatCard label="Total Time" value={formatDuration(results.durationSeconds)} />
            <StatCard label="Avg. Time" value={formatDuration(avgTime)} />
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

// Helper component for individual stats
const StatCard = ({ label, value, color = 'text-gray-800' }: { label: string, value: string | number, color?: string }) => (
    <div className="bg-gray-100 p-4 rounded-lg text-center sm:text-left">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
);
