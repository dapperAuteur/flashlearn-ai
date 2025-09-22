/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRef, useState, useMemo } from 'react';
import { toPng } from 'html-to-image';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { IStudySession } from '@/models/StudySession';
import ConfidenceResults from './ConfidenceResults';
import { Logger, LogContext } from '@/lib/logging/client-logger';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ShareableResultsCardProps {
  initialResults: IStudySession & { setName?: string };
  cardResults?: any[]; // Add this
}


const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function ShareableResultsCard({ initialResults, cardResults = [] }: ShareableResultsCardProps) {

  //  DEBUG: Log the cardResults to see what we're getting
  console.log('ShareableResultsCard - cardResults:', cardResults);
  console.log('ShareableResultsCard - cardResults length:', cardResults.length);
  console.log('ShareableResultsCard - first result:', cardResults[0]);

  const hasConfidenceData = cardResults.some(result => {
        console.log('Checking result for confidence:', result?.confidenceRating);

        return result.confidenceRating !== undefined
      });

      console.log('ShareableResultsCard - hasConfidenceData:', hasConfidenceData);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const results = useMemo(() => {
    const accuracy = initialResults.totalCards > 0 
      ? (initialResults.correctCount / initialResults.totalCards) * 100 
      : 0;
      const sessionDate = new Date();
    return { ...initialResults, accuracy, sessionDate };
  }, [initialResults]);

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const handleShare = async () => {
    if (!cardRef.current) {
      Logger.error(LogContext.STUDY, "Card reference not found for sharing.");
      return;
    }
    setIsSharing(true);
    Logger.log(LogContext.STUDY, "Attempting to generate and share results image.");

    try {
      const imageUrl = await toPng(cardRef.current, { 
        cacheBust: true, 
        width: hasConfidenceData ? 1200 : 1080,
        height: hasConfidenceData ? 1800 : 1080, // Taller if confidence data
        style: { 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: '2rem',
        }  
      });
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'study-results.png', { type: 'image/png' });
      
      const domain = window.location.host;
      const setName = results.setName || 'a flashcard set';

      const shareData = {
        title: `My results for ${setName}!`,
        text: `I just studied "${setName}" on ${domain}. Check out my results!`,
        files: [file],
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        Logger.info(LogContext.STUDY, "Successfully shared results via Web Share API.");
      } else {
        Logger.warning(LogContext.STUDY, "Web Share API not supported. Fallback triggered.");
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'study-results.png';
        link.click();
      }
    } catch (error) {
      Logger.error(LogContext.STUDY, "Failed to share study results.", { error });
      alert("Oops! Something went wrong while trying to share your results.");
    } finally {
      setIsSharing(false);
    }
  };

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
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        <div ref={cardRef} className="flex flex-col justify-between h-full">
            
        <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2 text-center">Session Complete!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
          Results for: <span className="font-semibold">{results.setName || 'this set'}</span>
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Accuracy" value={`${results.accuracy.toFixed(0)}%`} color="text-blue-600" />
            <StatCard label="Correct" value={results.correctCount} color="text-green-600" />
            <StatCard label="Incorrect" value={results.incorrectCount} color="text-red-600" />
            <StatCard label="Total Cards" value={`${results.completedCards}/${results.totalCards}`} />
            <StatCard label="Total Time" value={formatDuration(results.durationSeconds)} />
            <StatCard label="Avg. Time" value={`${formatDuration(results.totalCards > 0 ? results.durationSeconds / results.totalCards : 0)}/card`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Performance</h3>
            <div className="w-full max-w-xs mx-auto">
              <Doughnut data={chartData} options={{ plugins: { legend: { display: false } } }} />
            </div>
          </div>
        </div>
        {/* Include Confidence Results in shareable image */}
            {hasConfidenceData && (
              <div className="mt-8">
                <ConfidenceResults cardResults={cardResults} />
              </div>
            )}
      </div>
      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
        <p className="text-lg font-bold text-gray-800 dark:text-gray-200">Flashlearn AI</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{typeof window !== 'undefined' ? window.location.host : ''}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {results.sessionDate ? formatDateTime(results.sessionDate) : (typeof window !== 'undefined' ? window.location.host : '')}
        </p>
        </div>
      </div>
      </div>
      {/* <ConfidenceResults 
        cardResults={cardResults} 
        hasConfidenceData={hasConfidenceData} 
      /> */}
      <div className="mt-8 text-center">
        {/* You may want to add the resetSession button back here if needed */}
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="w-full sm:w-auto py-3 px-8 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50"
        >
          {isSharing ? 'Generating Image...' : 'Share Your Results'}
        </button>
      </div>
    </div>
  );
}

const StatCard = ({ label, value, color = 'text-gray-800' }: { label: string, value: string | number, color?: string }) => (
  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-center sm:text-left">
    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`text-2xl font-bold ${color} dark:text-white`}>{value}</p>
  </div>
);

