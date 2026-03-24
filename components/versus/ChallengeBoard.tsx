'use client';

import { useState, useMemo } from 'react';
import {
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';

export interface ScoreBreakdown {
  accuracyScore: number;
  speedScore: number;
  confidenceScore: number;
  streakScore: number;
  accuracy: number;
  averageTimeSeconds: number;
  longestStreak: number;
}

export interface BoardParticipant {
  userId: string;
  userName: string;
  status: string;
  compositeScore: number | null;
  scoreBreakdown: ScoreBreakdown | null;
  rank: number | null;
  completedAt: string | null;
}

export interface BoardChallenge {
  _id: string;
  challengeCode: string;
  setName: string;
  flashcardSetId: string;
  studyMode: string;
  studyDirection: string;
  cardCount: number;
  scope: string;
  status: string;
  expiresAt: string;
  maxParticipants: number;
}

interface ChallengeBoardProps {
  challenge: BoardChallenge;
  participants: BoardParticipant[];
  currentUserId: string | null;
}

type SortMetric = 'score' | 'accuracy' | 'speed' | 'streak';

const SORT_OPTIONS: { key: SortMetric; label: string }[] = [
  { key: 'score', label: 'Score' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'speed', label: 'Avg Speed' },
  { key: 'streak', label: 'Streak' },
];

const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];

function getRankBarColor(rank: number) {
  if (rank === 1) return 'bg-amber-400';
  if (rank === 2) return 'bg-gray-400';
  if (rank === 3) return 'bg-amber-700';
  return 'bg-blue-400';
}

function formatTime(seconds: number) {
  return `${seconds.toFixed(1)}s`;
}

function getSortValue(p: BoardParticipant, metric: SortMetric): number {
  if (p.status !== 'completed' || p.compositeScore === null) return -Infinity;
  if (metric === 'score') return p.compositeScore;
  if (!p.scoreBreakdown) return p.compositeScore;
  if (metric === 'accuracy') return p.scoreBreakdown.accuracy;
  if (metric === 'speed') return -(p.scoreBreakdown.averageTimeSeconds); // lower = better
  if (metric === 'streak') return p.scoreBreakdown.longestStreak;
  return p.compositeScore;
}

function getSortDisplay(p: BoardParticipant, metric: SortMetric): string {
  if (p.status !== 'completed') return '—';
  if (metric === 'score') return p.compositeScore?.toString() ?? '—';
  if (!p.scoreBreakdown) return p.compositeScore?.toString() ?? '—';
  if (metric === 'accuracy') return `${p.scoreBreakdown.accuracy.toFixed(1)}%`;
  if (metric === 'speed') return formatTime(p.scoreBreakdown.averageTimeSeconds);
  if (metric === 'streak') return `${p.scoreBreakdown.longestStreak}`;
  return '—';
}

function getBarWidth(p: BoardParticipant, metric: SortMetric, max: number): number {
  if (p.status !== 'completed') return 0;
  if (metric === 'score') return max > 0 ? ((p.compositeScore ?? 0) / 1000) * 100 : 0;
  if (!p.scoreBreakdown) return 0;
  if (metric === 'accuracy') return p.scoreBreakdown.accuracy;
  if (metric === 'speed') {
    // invert: 30s = 0%, 3s = 100%
    const t = p.scoreBreakdown.averageTimeSeconds;
    return Math.max(0, Math.min(100, ((30 - t) / 27) * 100));
  }
  if (metric === 'streak') return max > 0 ? (p.scoreBreakdown.longestStreak / max) * 100 : 0;
  return 0;
}

// ---- Comparison panel ----

interface DiffRowProps {
  label: string;
  youValue: string;
  themValue: string;
  youRaw: number;
  themRaw: number;
  higherIsBetter?: boolean;
}

function DiffRow({ label, youValue, themValue, youRaw, themRaw, higherIsBetter = true }: DiffRowProps) {
  const youWins = higherIsBetter ? youRaw > themRaw : youRaw < themRaw;
  const equal = youRaw === themRaw;
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-3 text-xs text-gray-600 font-medium whitespace-nowrap">{label}</td>
      <td className={`py-2 px-3 text-sm font-semibold text-center ${equal ? 'text-gray-700' : youWins ? 'text-green-700' : 'text-red-600'}`}>
        {youValue}
      </td>
      <td className="py-2 px-2 text-center">
        {equal ? (
          <MinusIcon className="h-3.5 w-3.5 text-gray-600 mx-auto" aria-hidden="true" />
        ) : youWins ? (
          <ChevronUpIcon className="h-3.5 w-3.5 text-green-500 mx-auto" aria-hidden="true" />
        ) : (
          <ChevronDownIcon className="h-3.5 w-3.5 text-red-400 mx-auto" aria-hidden="true" />
        )}
      </td>
      <td className={`py-2 px-3 text-sm font-semibold text-center ${equal ? 'text-gray-700' : !youWins ? 'text-green-700' : 'text-red-600'}`}>
        {themValue}
      </td>
    </tr>
  );
}

interface ComparisonPanelProps {
  you: BoardParticipant | null;
  them: BoardParticipant;
  onClose: () => void;
}

function ComparisonPanel({ you, them, onClose }: ComparisonPanelProps) {
  const youBreak = you?.scoreBreakdown;
  const themBreak = them.scoreBreakdown;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 md:static md:inset-auto md:z-auto bg-white border-t md:border md:rounded-xl border-gray-200 shadow-2xl md:shadow-sm p-5"
      role="dialog"
      aria-label={`Score comparison: You vs ${them.userName}`}
      aria-modal="true"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {you ? 'You' : 'Me'} vs {them.userName}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Close comparison"
        >
          <XMarkIcon className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 mb-1">
        <div />
        <div className="px-3 text-xs font-medium text-blue-600 text-center w-20">
          {you ? 'You' : '—'}
        </div>
        <div className="px-2 w-8" />
        <div className="px-3 text-xs font-medium text-gray-600 text-center w-20">
          {them.userName}
        </div>
      </div>

      <table className="w-full">
        <tbody>
          <DiffRow
            label="Total Score"
            youValue={you?.compositeScore?.toString() ?? '—'}
            themValue={them.compositeScore?.toString() ?? '—'}
            youRaw={you?.compositeScore ?? 0}
            themRaw={them.compositeScore ?? 0}
          />
          {youBreak && themBreak && (
            <>
              <DiffRow
                label="Accuracy"
                youValue={`${youBreak.accuracy.toFixed(1)}%`}
                themValue={`${themBreak.accuracy.toFixed(1)}%`}
                youRaw={youBreak.accuracy}
                themRaw={themBreak.accuracy}
              />
              <DiffRow
                label="Avg Speed"
                youValue={formatTime(youBreak.averageTimeSeconds)}
                themValue={formatTime(themBreak.averageTimeSeconds)}
                youRaw={youBreak.averageTimeSeconds}
                themRaw={themBreak.averageTimeSeconds}
                higherIsBetter={false}
              />
              <DiffRow
                label="Best Streak"
                youValue={`${youBreak.longestStreak}`}
                themValue={`${themBreak.longestStreak}`}
                youRaw={youBreak.longestStreak}
                themRaw={themBreak.longestStreak}
              />
              <DiffRow
                label="Accuracy Pts"
                youValue={`${youBreak.accuracyScore}`}
                themValue={`${themBreak.accuracyScore}`}
                youRaw={youBreak.accuracyScore}
                themRaw={themBreak.accuracyScore}
              />
              <DiffRow
                label="Speed Pts"
                youValue={`${youBreak.speedScore}`}
                themValue={`${themBreak.speedScore}`}
                youRaw={youBreak.speedScore}
                themRaw={themBreak.speedScore}
              />
              <DiffRow
                label="Streak Pts"
                youValue={`${youBreak.streakScore}`}
                themValue={`${themBreak.streakScore}`}
                youRaw={youBreak.streakScore}
                themRaw={themBreak.streakScore}
              />
            </>
          )}
        </tbody>
      </table>

      {(!youBreak || !themBreak) && (
        <p className="text-xs text-gray-600 mt-2 text-center">
          Detailed breakdown available for challenges completed after the board update.
        </p>
      )}
    </div>
  );
}

// ---- Podium ----

interface PodiumProps {
  top3: BoardParticipant[];
  currentUserId: string | null;
  sortMetric: SortMetric;
}

function Podium({ top3, currentUserId, sortMetric }: PodiumProps) {
  // Arrange: 2nd | 1st | 3rd (classic podium)
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = ['h-16', 'h-24', 'h-12'];
  const orderHeights: Record<number, string> = { 0: heights[1], 1: heights[0], 2: heights[2] };

  return (
    <>
      {/* Mobile: vertical stack */}
      <div className="md:hidden space-y-2 mb-4">
        {top3.map((p, i) => (
          <div
            key={p.userId}
            className={`flex items-center gap-3 p-3 rounded-lg border ${p.userId === currentUserId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
            aria-label={`${i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'} place: ${p.userName}, ${getSortDisplay(p, sortMetric)}`}
          >
            <span className="text-2xl" aria-hidden="true">{MEDAL_EMOJI[i]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {p.userName}
                {p.userId === currentUserId && <span className="ml-1.5 text-xs text-blue-500 font-normal">(you)</span>}
              </p>
              <p className="text-xs text-gray-600">{getSortDisplay(p, sortMetric)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: classic 2-1-3 podium */}
      <div className="hidden md:flex items-end justify-center gap-4 mb-6" role="list" aria-label="Top 3 podium">
        {order.map((p, displayIdx) => {
          const actualRank = displayIdx === 0 ? 1 : displayIdx === 1 ? 0 : 2; // mapping to top3 index
          const rankLabel = actualRank === 1 ? '1st' : actualRank === 0 ? '2nd' : '3rd';
          const isYou = p.userId === currentUserId;
          return (
            <div
              key={p.userId}
              className="flex flex-col items-center gap-1"
              role="listitem"
              aria-label={`${rankLabel} place: ${p.userName}, ${getSortDisplay(p, sortMetric)}`}
            >
              <span className="text-xl" aria-hidden="true">{MEDAL_EMOJI[actualRank]}</span>
              <p className={`text-sm font-semibold truncate max-w-[96px] text-center ${isYou ? 'text-blue-700' : 'text-gray-800'}`}>
                {p.userName}
                {isYou && <span className="block text-xs font-normal text-blue-500">(you)</span>}
              </p>
              <p className="text-xs font-mono text-gray-600">{getSortDisplay(p, sortMetric)}</p>
              <div
                className={`w-24 rounded-t-lg ${orderHeights[displayIdx]} ${displayIdx === 1 ? 'bg-amber-400' : displayIdx === 0 ? 'bg-gray-300' : 'bg-amber-700'}`}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---- Main component ----

export default function ChallengeBoard({ challenge, participants, currentUserId }: ChallengeBoardProps) {
  const [sortMetric, setSortMetric] = useState<SortMetric>('score');
  const [compareUserId, setCompareUserId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const completed = participants.filter((p) => p.status === 'completed');
    const inProgress = participants.filter((p) => p.status !== 'completed');

    const sortedCompleted = [...completed].sort(
      (a, b) => getSortValue(b, sortMetric) - getSortValue(a, sortMetric),
    );
    return [...sortedCompleted, ...inProgress];
  }, [participants, sortMetric]);

  const top3 = sorted.filter((p) => p.status === 'completed').slice(0, 3);
  const showPodium = top3.length >= 3;

  const maxStreak = useMemo(
    () => Math.max(0, ...participants.map((p) => p.scoreBreakdown?.longestStreak ?? 0)),
    [participants],
  );

  const youParticipant = currentUserId
    ? participants.find((p) => p.userId === currentUserId) ?? null
    : null;

  const compareParticipant = compareUserId
    ? participants.find((p) => p.userId === compareUserId) ?? null
    : null;

  const scopeLabel =
    challenge.scope === 'public' ? 'Public' : challenge.scope === 'classroom' ? 'Classroom' : 'Private';
  const scopeColor =
    challenge.scope === 'public'
      ? 'bg-green-100 text-green-700'
      : challenge.scope === 'classroom'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-600';

  const completedCount = participants.filter((p) => p.status === 'completed').length;
  const modeLabel =
    challenge.studyMode === 'multiple-choice' ? 'Multiple Choice' : 'Classic';
  const dirLabel =
    challenge.studyDirection === 'back-to-front' ? 'Back→Front' : 'Front→Back';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-wrap items-start gap-2 mb-1">
          <h1 className="text-xl font-bold text-gray-900 leading-tight flex-1">
            {challenge.setName} — Challenge Board
          </h1>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${scopeColor}`}>
            {scopeLabel}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {modeLabel} · {dirLabel} · {challenge.cardCount} cards ·{' '}
          <span className="font-medium text-gray-700">{completedCount}/{participants.length}</span> completed
        </p>
        <p className="text-xs text-gray-600 mt-0.5 font-mono">{challenge.challengeCode}</p>
      </div>

      {/* Podium */}
      {showPodium && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5" aria-label="Top 3 podium">
          <Podium top3={top3} currentUserId={currentUserId} sortMetric={sortMetric} />
        </div>
      )}

      {/* Board */}
      <div className={`${compareParticipant ? 'md:grid md:grid-cols-[1fr_340px] md:gap-4' : ''}`}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Sort controls */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 overflow-x-auto" role="toolbar" aria-label="Sort rankings by">
            <span className="text-xs text-gray-600 shrink-0 mr-1">Sort:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortMetric(opt.key)}
                aria-pressed={sortMetric === opt.key}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  sortMetric === opt.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Ranked list */}
          <div role="table" aria-label="Challenge rankings">
            <div role="rowgroup">
              <ul aria-live="polite" aria-atomic="false">
                {sorted.map((p, idx) => {
                  const isCompleted = p.status === 'completed';
                  const isYou = p.userId === currentUserId;
                  const rankDisplay = isCompleted ? idx + 1 : null;
                  const barW = getBarWidth(p, sortMetric, maxStreak);
                  const isComparing = compareUserId === p.userId;
                  const canCompare = isCompleted && !isYou;

                  return (
                    <li
                      key={p.userId}
                      role="row"
                      aria-label={`${rankDisplay ? `Rank ${rankDisplay}: ` : ''}${p.userName}${isYou ? ' (you)' : ''}, ${getSortDisplay(p, sortMetric)}`}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${
                        isYou ? 'bg-blue-50' : isComparing ? 'bg-purple-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Rank badge */}
                      <div className="w-7 shrink-0 text-center" aria-hidden="true">
                        {rankDisplay && rankDisplay <= 3 ? (
                          <span className="text-lg">{MEDAL_EMOJI[rankDisplay - 1]}</span>
                        ) : rankDisplay ? (
                          <span className="text-sm font-bold text-gray-600">#{rankDisplay}</span>
                        ) : (
                          <span className="text-sm text-gray-500">⏳</span>
                        )}
                      </div>

                      {/* Name + bar + sub-metric */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isYou ? 'text-blue-700' : 'text-gray-800'}`}>
                          {p.userName}
                          {isYou && <span className="ml-1.5 text-xs text-blue-500 font-normal">(you)</span>}
                        </p>
                        {isCompleted ? (
                          <>
                            <div
                              className="mt-1 w-full bg-gray-100 rounded-full h-1.5"
                              aria-hidden="true"
                            >
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${getRankBarColor(rankDisplay ?? 99)}`}
                                style={{ width: `${barW}%` }}
                              />
                            </div>
                            {p.scoreBreakdown && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                {p.scoreBreakdown.accuracy.toFixed(0)}% acc · {formatTime(p.scoreBreakdown.averageTimeSeconds)} avg · {p.scoreBreakdown.longestStreak} streak
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-gray-600 italic mt-0.5">In progress…</p>
                        )}
                      </div>

                      {/* Score */}
                      <div className="shrink-0 text-right w-14">
                        <span className={`text-sm font-semibold ${isCompleted ? 'text-gray-800' : 'text-gray-500'}`}>
                          {getSortDisplay(p, sortMetric)}
                        </span>
                      </div>

                      {/* Compare button */}
                      {canCompare && (
                        <button
                          onClick={() => setCompareUserId(isComparing ? null : p.userId)}
                          aria-pressed={isComparing}
                          aria-label={`Compare your score with ${p.userName}`}
                          className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            isComparing
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {isComparing ? 'Close' : 'Compare'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* Comparison panel — desktop inline */}
        {compareParticipant && (
          <div className="hidden md:block">
            <ComparisonPanel
              you={youParticipant}
              them={compareParticipant}
              onClose={() => setCompareUserId(null)}
            />
          </div>
        )}
      </div>

      {/* Comparison drawer — mobile */}
      {compareParticipant && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setCompareUserId(null)}
            aria-hidden="true"
          />
          <ComparisonPanel
            you={youParticipant}
            them={compareParticipant}
            onClose={() => setCompareUserId(null)}
          />
        </div>
      )}
    </div>
  );
}
