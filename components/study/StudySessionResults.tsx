'use client';

import { useEffect, useMemo, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useSession } from 'next-auth/react';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { useStudySession } from '@/contexts/StudySessionContext';
import ShareModal from '@/components/ShareModal';
import { ShareIcon } from '@heroicons/react/24/outline';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StudySessionResults() {
  const { sessionId, flashcards, cardResults, flashcardSetName } = useStudySession();
  const { data: authSession } = useSession();

  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // NEW: Derive the results object directly from the context state.
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
    if (results.sessionId !== 'unknown-session') {
      Logger.log(
        LogContext.STUDY,
        `Study session results displayed for session ID: ${results.sessionId}`,
        { ...results }
      );
    }
  }, [results]);

  const handleShare = async () => {
    if (!sessionId || isSharing) return;

    setIsSharing(true);
    setShareError(null);

    try {
      const response = await fetch(`/api/study/sessions/${sessionId}/share`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to share');
      }

      const data = await response.json();

      if (data.isShareable && data.shareUrl) {
        setShareUrl(data.shareUrl);
        setShareModalOpen(true);
      } else {
        // Was unshared — re-toggle to share
        setShareUrl(null);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to share results';
      setShareError(msg);
      Logger.error(LogContext.STUDY, 'Share toggle failed', { sessionId, error: msg });
    } finally {
      setIsSharing(false);
    }
  };

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
      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        {authSession?.user && sessionId && (
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <ShareIcon className="h-4 w-4 mr-2" />
            {isSharing ? 'Sharing...' : 'Share Results'}
          </button>
        )}
      </div>

      {shareError && (
        <p className="mt-3 text-center text-sm text-red-600">{shareError}</p>
      )}

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl || ''}
        title={`${results.accuracy.toFixed(0)}% on ${flashcardSetName}`}
      />
    </div>
  );
}

const StatCard = ({ label, value, color = 'text-gray-800' }: { label: string, value: string | number, color?: string }) => (
  <div className="bg-gray-100 p-4 rounded-lg text-center sm:text-left">
    <p className="text-sm text-gray-500">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);