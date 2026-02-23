'use client';

import { useEffect, useMemo, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useSession } from 'next-auth/react';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { useStudySession } from '@/contexts/StudySessionContext';
import ShareModal from '@/components/ShareModal';
import {
  ShareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

ChartJS.register(ArcElement, Tooltip, Legend);

type CardFilter = 'all' | 'missed' | 'correct';

export default function StudySessionResults() {
  const {
    sessionId,
    flashcards,
    cardResults,
    flashcardSetName,
    startSession,
    studyDirection,
    resetSession,
  } = useStudySession();
  const { data: authSession } = useSession();

  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [cardFilter, setCardFilter] = useState<CardFilter>('all');

  const results = useMemo(
    () => ({
      sessionId: sessionId || 'unknown-session',
      totalCards: flashcards.length,
      completedCards: cardResults.length,
      correctCount: cardResults.filter((r) => r.isCorrect).length,
      incorrectCount: cardResults.filter((r) => !r.isCorrect).length,
      accuracy:
        cardResults.length > 0
          ? (cardResults.filter((r) => r.isCorrect).length / cardResults.length) * 100
          : 0,
      durationSeconds: Math.round(
        cardResults.reduce((total, result) => total + result.timeSeconds, 0),
      ),
    }),
    [sessionId, flashcards, cardResults],
  );

  // Build per-card results with flashcard text
  const enrichedCardResults = useMemo(() => {
    const flashcardMap = new Map(
      flashcards.map((fc) => [String(fc._id), fc]),
    );

    return cardResults.map((result) => {
      const card = flashcardMap.get(result.flashcardId);
      return {
        ...result,
        front: card?.front || 'Unknown',
        back: card?.back || 'Unknown',
      };
    });
  }, [cardResults, flashcards]);

  const filteredCards = useMemo(() => {
    if (cardFilter === 'missed') return enrichedCardResults.filter((r) => !r.isCorrect);
    if (cardFilter === 'correct') return enrichedCardResults.filter((r) => r.isCorrect);
    return enrichedCardResults;
  }, [enrichedCardResults, cardFilter]);

  const missedCardIds = useMemo(
    () => cardResults.filter((r) => !r.isCorrect).map((r) => r.flashcardId),
    [cardResults],
  );

  useEffect(() => {
    if (results.sessionId !== 'unknown-session') {
      Logger.log(
        LogContext.STUDY,
        `Study session results displayed for session ID: ${results.sessionId}`,
        { ...results },
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

  const handleReviewMissed = () => {
    if (missedCardIds.length === 0 || !flashcards[0]?.listId) return;
    const listId = String(flashcards[0].listId);
    resetSession();
    startSession(listId, studyDirection, missedCardIds);
  };

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0m 0s';
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 text-center">
        Session Complete!
      </h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6 text-center">
        Results for: <span className="font-semibold">{flashcardSetName}</span>
      </p>

      {/* Stats + Chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Accuracy" value={`${results.accuracy.toFixed(0)}%`} color="text-blue-600" />
          <StatCard label="Correct" value={results.correctCount} color="text-green-600" />
          <StatCard label="Incorrect" value={results.incorrectCount} color="text-red-600" />
          <StatCard label="Total Cards" value={`${results.completedCards}/${results.totalCards}`} />
          <StatCard label="Total Time" value={formatDuration(results.durationSeconds)} />
          <StatCard
            label="Avg. Time"
            value={`${formatDuration(results.completedCards > 0 ? results.durationSeconds / results.completedCards : 0)}/card`}
          />
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-base font-semibold mb-3 text-gray-700">Performance</h3>
          <div className="w-40 sm:w-48">
            <Doughnut data={chartData} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-6">
        {missedCardIds.length > 0 && (
          <button
            onClick={handleReviewMissed}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors text-sm"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Review {missedCardIds.length} Missed Card{missedCardIds.length !== 1 ? 's' : ''}
          </button>
        )}
        {authSession?.user && sessionId && (
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors text-sm"
          >
            <ShareIcon className="h-4 w-4 mr-2" />
            {isSharing ? 'Sharing...' : 'Share Results'}
          </button>
        )}
      </div>

      {shareError && <p className="mb-4 text-center text-sm text-red-600">{shareError}</p>}

      {/* Card Results Breakdown */}
      {enrichedCardResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700">Card Results</h3>
          </div>

          {/* Filter tabs — horizontally scrollable on mobile */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {(['all', 'missed', 'correct'] as CardFilter[]).map((filter) => {
              const count =
                filter === 'all'
                  ? enrichedCardResults.length
                  : filter === 'missed'
                    ? results.incorrectCount
                    : results.correctCount;
              return (
                <button
                  key={filter}
                  onClick={() => setCardFilter(filter)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    cardFilter === filter
                      ? filter === 'missed'
                        ? 'bg-red-100 text-red-800'
                        : filter === 'correct'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'missed' ? 'Missed' : 'Correct'} ({count})
                </button>
              );
            })}
          </div>

          {/* Card list */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredCards.map((card, index) => (
              <div
                key={`${card.flashcardId}-${index}`}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  card.isCorrect
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {card.isCorrect ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-red-600" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{card.front}</p>
                  <p className="text-xs text-gray-600 truncate mt-0.5">{card.back}</p>
                </div>

                {/* Meta */}
                <div className="flex-shrink-0 flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {card.timeSeconds.toFixed(1)}s
                  </span>
                  {card.confidenceRating && (
                    <span className="bg-gray-200 rounded px-1.5 py-0.5">
                      {card.confidenceRating}/5
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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

const StatCard = ({
  label,
  value,
  color = 'text-gray-800',
}: {
  label: string;
  value: string | number;
  color?: string;
}) => (
  <div className="bg-gray-100 p-3 rounded-lg text-center">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
  </div>
);
