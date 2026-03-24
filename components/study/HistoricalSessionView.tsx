'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import ShareModal from '@/components/ShareModal';
import CardResultRow from '@/app/results/[sessionId]/CardResultRow';
import {
  ShareIcon,
  ArrowPathIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

ChartJS.register(ArcElement, Tooltip, Legend);

type CardFilter = 'all' | 'missed' | 'correct';

const MODE_COMBOS: { mode: 'classic' | 'multiple-choice'; direction: 'front-to-back' | 'back-to-front'; label: string }[] = [
  { mode: 'classic', direction: 'front-to-back', label: 'Classic · Front→Back' },
  { mode: 'classic', direction: 'back-to-front', label: 'Classic · Back→Front' },
  { mode: 'multiple-choice', direction: 'front-to-back', label: 'Multiple Choice · Front→Back' },
  { mode: 'multiple-choice', direction: 'back-to-front', label: 'Multiple Choice · Back→Front' },
];

export interface SerializedCardResult {
  id: string;
  flashcardId: string;
  isCorrect: boolean;
  confidenceRating: number | null;
  front: string;
  back: string;
  timeSeconds: number;
  studyMode?: string;
  studyDirection?: string;
}

interface ModeBreakdownEntry {
  mode: string;
  direction: string;
  accuracy: number;
  attempts: number;
}

interface HistoricalSessionViewProps {
  sessionId: string;
  setId: string | null;
  setName: string;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  totalCards: number;
  durationSeconds: number;
  studyMode: string;
  studyDirection: string;
  isOwner: boolean;
  isSetPublic: boolean;
  modeBreakdown: ModeBreakdownEntry[];
  cardResults: SerializedCardResult[];
  initialShareUrl: string | null;
}

const StatCard = ({ label, value, color = 'text-gray-800' }: { label: string; value: string | number; color?: string }) => (
  <div className="bg-gray-100 p-3 rounded-lg text-center" role="group" aria-label={`${label}: ${value}`}>
    <p className="text-xs text-gray-600">{label}</p>
    <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
  </div>
);

const formatDuration = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '0m 0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

export default function HistoricalSessionView({
  sessionId,
  setId,
  setName,
  accuracy,
  correctCount,
  incorrectCount,
  totalCards,
  durationSeconds,
  studyMode,
  studyDirection,
  isOwner,
  isSetPublic,
  modeBreakdown,
  cardResults,
  initialShareUrl,
}: HistoricalSessionViewProps) {
  const [cardFilter, setCardFilter] = useState<CardFilter>('all');
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(initialShareUrl);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [insightExpanded, setInsightExpanded] = useState(true);

  const missedCount = cardResults.filter((r) => !r.isCorrect).length;

  const filteredCards = useMemo(() => {
    if (cardFilter === 'missed') return cardResults.filter((r) => !r.isCorrect);
    if (cardFilter === 'correct') return cardResults.filter((r) => r.isCorrect);
    return cardResults;
  }, [cardResults, cardFilter]);

  const nudgeMessage = useMemo(() => {
    const currentEntry = modeBreakdown.find((m) => m.mode === studyMode && m.direction === studyDirection);
    const reverseDirection = studyDirection === 'front-to-back' ? 'back-to-front' : 'front-to-back';
    const reverseEntry = modeBreakdown.find((m) => m.mode === studyMode && m.direction === reverseDirection);
    const hasTriedReverse = !!reverseEntry;
    const reverseIsWeaker = hasTriedReverse && currentEntry && reverseEntry.accuracy < currentEntry.accuracy - 10;

    if (!hasTriedReverse && studyDirection === 'front-to-back') {
      return `You've only studied front→back. Test yourself in reverse — back-to-front is the gold standard for true mastery.`;
    }
    if (reverseIsWeaker) {
      return `Your ${reverseDirection} accuracy (${reverseEntry!.accuracy}%) is noticeably lower. Strengthen it with a focused reverse session.`;
    }
    if (studyMode === 'classic') {
      const mcEntry = modeBreakdown.find((m) => m.mode === 'multiple-choice' && m.direction === studyDirection);
      if (!mcEntry) return `Try Multiple Choice mode — it tests recognition differently and can reveal blind spots classic mode misses.`;
    }
    return null;
  }, [modeBreakdown, studyMode, studyDirection]);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    setShareError(null);
    try {
      const response = await fetch(`/api/study/sessions/${sessionId}/share`, { method: 'POST' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to share');
      }
      const data = await response.json();
      if (data.isShareable && data.shareUrl) {
        setShareUrl(data.shareUrl);
        setShareModalOpen(true);
      }
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Failed to share results');
    } finally {
      setIsSharing(false);
    }
  };

  const chartData = {
    labels: ['Correct', 'Incorrect'],
    datasets: [{
      data: [correctCount, incorrectCount],
      backgroundColor: ['#10B981', '#EF4444'],
      borderColor: ['#059669', '#DC2626'],
      borderWidth: 1,
    }],
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8 max-w-2xl mx-auto" role="region" aria-label="Historical session results">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 text-center">
        Session Complete!
      </h2>
      <p className="text-sm sm:text-base text-gray-600 mb-6 text-center">
        Results for: <span className="font-semibold">{setName}</span>
      </p>

      {/* Stats + Chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6" aria-label="Session statistics" role="region">
        <div className="grid grid-cols-2 gap-3" aria-label="Score breakdown">
          <StatCard label="Accuracy" value={`${accuracy}%`} color="text-blue-600" />
          <StatCard label="Correct" value={correctCount} color="text-green-600" />
          <StatCard label="Incorrect" value={incorrectCount} color="text-red-600" />
          <StatCard label="Total Cards" value={`${correctCount + incorrectCount}/${totalCards}`} />
          <StatCard label="Total Time" value={formatDuration(durationSeconds)} />
          <StatCard
            label="Avg. Time"
            value={`${formatDuration(totalCards > 0 ? durationSeconds / totalCards : 0)}/card`}
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
      {isOwner && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-6">
          {missedCount > 0 && setId && (
            <Link
              href={`/study?setId=${setId}`}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors text-sm"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Review {missedCount} Missed Card{missedCount !== 1 ? 's' : ''}
            </Link>
          )}
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors text-sm"
          >
            <ShareIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            {isSharing ? 'Sharing...' : 'Share Results'}
          </button>
          {setId && (
            <a
              href={`/versus/create?setId=${setId}`}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors text-sm"
            >
              ⚔️ Challenge a Friend
            </a>
          )}
        </div>
      )}

      {/* Non-owner CTA */}
      {!isOwner && setId && (
        <div className="flex flex-col items-center gap-3 mb-6">
          <a
            href={`/versus/create?setId=${setId}`}
            className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
          >
            ⚔️ Think you can do better? Start a Challenge
          </a>
          <a
            href="/auth/signup?utm_source=results_page&utm_medium=share&utm_campaign=results"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Create your own AI flashcards — free →
          </a>
        </div>
      )}

      {shareError && <p className="mb-4 text-center text-sm text-red-600">{shareError}</p>}

      {/* Study Style Insights */}
      {modeBreakdown.length > 0 && (
        <div className="mb-6 border border-blue-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setInsightExpanded((v) => !v)}
            aria-expanded={insightExpanded}
            aria-label="Study Style Insights"
            className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
              <LightBulbIcon className="h-4 w-4" aria-hidden="true" />
              Study Style Insights
            </div>
            {insightExpanded
              ? <ChevronUpIcon className="h-4 w-4 text-blue-600" aria-hidden="true" />
              : <ChevronDownIcon className="h-4 w-4 text-blue-600" aria-hidden="true" />}
          </button>

          {insightExpanded && (
            <div className="p-4 bg-white">
              {nudgeMessage && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  {nudgeMessage}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {MODE_COMBOS.map((combo) => {
                  const entry = modeBreakdown.find((m) => m.mode === combo.mode && m.direction === combo.direction);
                  const isCurrent = combo.mode === studyMode && combo.direction === studyDirection;
                  const isUntried = !entry;
                  const isWeak = entry && entry.accuracy < 60;
                  return (
                    <div
                      key={`${combo.mode}-${combo.direction}`}
                      className={`rounded-lg border p-3 text-xs flex flex-col gap-1 ${
                        isCurrent
                          ? 'border-blue-400 bg-blue-50'
                          : isWeak
                          ? 'border-red-200 bg-red-50'
                          : isUntried
                          ? 'border-dashed border-gray-300 bg-gray-50'
                          : 'border-green-200 bg-green-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="font-medium text-gray-800 leading-tight">{combo.label}</span>
                        {isCurrent && <span className="text-blue-600 font-semibold text-xs">This session</span>}
                        {!isCurrent && isWeak && <span className="text-red-600 font-semibold text-xs">Weak</span>}
                        {!isCurrent && isUntried && <span className="text-gray-600 font-semibold text-xs">Not tried</span>}
                      </div>
                      {entry ? (
                        <div className="text-gray-700">
                          <span className={`font-bold ${isWeak ? 'text-red-700' : 'text-green-700'}`}>{entry.accuracy}%</span>
                          <span className="text-gray-600 ml-1">({entry.attempts} attempts)</span>
                        </div>
                      ) : (
                        <span className="text-gray-600 italic">No data yet</span>
                      )}
                      {!isCurrent && setId && (
                        <a
                          href={`/study?setId=${setId}`}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Study this way →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card Results */}
      {cardResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700">Card Results</h3>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Filter card results">
            {(['all', 'missed', 'correct'] as CardFilter[]).map((filter) => {
              const count = filter === 'all' ? cardResults.length : filter === 'missed' ? missedCount : correctCount;
              return (
                <button
                  key={filter}
                  role="tab"
                  aria-selected={cardFilter === filter}
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

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {filteredCards.map((card, index) => (
              <CardResultRow key={card.id || index} card={card} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      {(isOwner || isSetPublic) && setId && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/study?setId=${setId}`}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            Study Another Set
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Back to My Sets
          </Link>
        </div>
      )}

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl || ''}
        title={`${accuracy}% on ${setName}`}
        heading="Share Your Results"
        shareText="Check out my study results"
      />
    </div>
  );
}
