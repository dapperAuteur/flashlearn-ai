'use client';

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
  // Format duration as minutes and seconds
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Study Session Results</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Session Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Cards Studied:</span>
                <span className="font-medium text-gray-800">
                  {results.completedCards} of {results.totalCards}
                </span>
              </div>
              
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Correct Answers:</span>
                <span className="font-medium text-green-600">
                  {results.correctCount}
                </span>
              </div>
              
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Incorrect Answers:</span>
                <span className="font-medium text-red-600">
                  {results.incorrectCount}
                </span>
              </div>
              
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Accuracy:</span>
                <span className="font-medium text-gray-800">
                  {results.accuracy.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Total Time:</span>
                <span className="font-medium text-gray-800">
                  {formatDuration(results.durationSeconds)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Average Time per Card:</span>
                <span className="font-medium text-gray-800">
                  {formatDuration(Math.round(results.durationSeconds / results.completedCards))}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <button
              onClick={onReset}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Study Another List
            </button>
          </div>
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