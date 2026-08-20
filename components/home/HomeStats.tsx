'use client';

/**
 * Real personal numbers for the homepage.
 *
 * The homepage used to print literal figures into sentences about the signed-in
 * visitor: eight cards due, 87% accuracy, a twelve-day streak. A user on day one
 * read a congratulation meant for someone else. Everything here reads the same
 * two endpoints the dashboard already reads, so the homepage and the dashboard
 * can never disagree.
 *
 * Two things this file is careful about:
 *
 * 1. One round trip per endpoint per page load. Several of these little pieces
 *    render in different corners of the same page, so the request is cached at
 *    module scope and every consumer awaits the same promise.
 * 2. A figure appears only when it is this reader's own figure. Everything else
 *    is one resting state with no number in it at all: still loading, nothing
 *    due, no sessions yet, request failed. That is deliberate. Copy written for
 *    zero still reads as a status report about the reader, and swapping one
 *    sentence for another mid-render is a flicker nobody asked for. The resting
 *    copy is already the right thing to show, so most readers never see a change.
 *
 * These only mount inside the signed-in branch of each homepage arm, which the
 * server decides with getServerSession. An anonymous visitor never mounts them
 * and therefore never triggers a fetch.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Target } from 'lucide-react';

export interface HomeStats {
  /** Cards whose spaced-repetition date has arrived, from /api/study/due-cards. */
  dueToday: number;
  /** Weighted average score across every set, from /api/study/stats. */
  accuracy: number;
  /** Consecutive days with a completed session, from /api/study/stats. */
  streak: number;
  /** Completed sessions, used to tell "0% accuracy" from "no data yet". */
  totalSessions: number;
}

export type HomeStatsState =
  | { status: 'loading' }
  | { status: 'ready'; stats: HomeStats }
  | { status: 'error' };

let inFlight: Promise<HomeStats> | null = null;

async function requestHomeStats(): Promise<HomeStats> {
  const [statsRes, dueRes] = await Promise.all([
    fetch('/api/study/stats', { cache: 'no-store' }),
    fetch('/api/study/due-cards', { cache: 'no-store' }),
  ]);

  if (!statsRes.ok || !dueRes.ok) {
    throw new Error('Study stats are unavailable');
  }

  const stats = await statsRes.json();
  const due = await dueRes.json();

  return {
    dueToday: Number(due?.totalDue) || 0,
    accuracy: Number(stats?.overallAccuracy) || 0,
    streak: Number(stats?.streak) || 0,
    totalSessions: Number(stats?.totalSessions) || 0,
  };
}

function loadHomeStats(): Promise<HomeStats> {
  if (!inFlight) {
    inFlight = requestHomeStats().catch((error) => {
      // Drop the cached rejection so a later mount can try again rather than
      // replaying one dropped connection for the rest of the page's life.
      inFlight = null;
      throw error;
    });
  }
  return inFlight;
}

/** Test seam: clears the shared request so each case starts from nothing. */
export function resetHomeStatsCache() {
  inFlight = null;
}

export function useHomeStats(): HomeStatsState {
  const [state, setState] = useState<HomeStatsState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    loadHomeStats().then(
      (stats) => {
        if (active) setState({ status: 'ready', stats });
      },
      () => {
        if (active) setState({ status: 'error' });
      },
    );

    return () => {
      active = false;
    };
  }, []);

  return state;
}

/**
 * The resting copy for each card. No figure, no count, nothing that reads as a
 * status report. Every state that is not a real fetched value uses these.
 */
export const RESTING_DUE_COPY = 'Review your due cards';
export const RESTING_ACCURACY_COPY = 'Track your progress';
export const RESTING_STREAK_SENTENCE =
  'Keep the momentum going with your personalized study session.';

export function dueCardsCopy(state: HomeStatsState): string {
  if (state.status !== 'ready' || state.stats.dueToday === 0) return RESTING_DUE_COPY;
  const count = state.stats.dueToday;
  return `Review ${count} card${count === 1 ? '' : 's'} due for optimal retention`;
}

export function accuracyCopy(state: HomeStatsState): string {
  // Zero sessions is not zero accuracy, and neither one earns a percentage on
  // the homepage, so both land on the same figure-free line.
  if (state.status !== 'ready' || state.stats.totalSessions === 0) return RESTING_ACCURACY_COPY;
  return `${state.stats.accuracy}% average accuracy across your sessions`;
}

export function streakCopy(state: HomeStatsState): string | null {
  // This pill exists only to state a number. With no streak to state there is
  // nothing figure-free left for it to say, so it does not render.
  if (state.status !== 'ready' || state.stats.streak === 0) return null;
  return `${state.stats.streak}-day study streak! Keep it up!`;
}

/**
 * A value that arrives after render has to be announced, not silently swapped
 * in, so every one of these sits in a polite live region. The resting copy is
 * the region's initial content, which screen readers do not announce as a
 * change, and it holds no digit either way.
 */
export function DueCardsSummary({ className }: { className?: string }) {
  const state = useHomeStats();
  return (
    <p className={className} aria-live="polite">
      {dueCardsCopy(state)}
    </p>
  );
}

export function AccuracySummary({ className }: { className?: string }) {
  const state = useHomeStats();
  return (
    <p className={className} aria-live="polite">
      {accuracyCopy(state)}
    </p>
  );
}

export function StreakBadge({ className }: { className?: string }) {
  const state = useHomeStats();
  const copy = streakCopy(state);

  // No streak text at all beats a wrong one: this pill exists only to state the
  // number, so a failed fetch removes it instead of guessing.
  if (copy === null) return null;

  return (
    <div className={className} aria-live="polite">
      <Target className="h-5 w-5 text-yellow-600" aria-hidden="true" />
      <span className="text-yellow-800 font-medium">{copy}</span>
    </div>
  );
}

export function StreakSentence({ className }: { className?: string }) {
  const state = useHomeStats();

  const copy =
    state.status === 'ready' && state.stats.streak > 0
      ? `You are on a ${state.stats.streak}-day streak. ${RESTING_STREAK_SENTENCE}`
      : RESTING_STREAK_SENTENCE;

  return (
    <p className={className} aria-live="polite">
      {copy}
    </p>
  );
}

export type HomeStatMetric = 'due' | 'accuracy' | 'streak' | 'sessions';

const METRIC_LABELS: Record<HomeStatMetric, string> = {
  due: 'Cards Due Today',
  accuracy: 'Average Accuracy',
  streak: 'Day Streak',
  sessions: 'Study Sessions',
};

function metricValue(state: HomeStatsState, metric: HomeStatMetric): string | null {
  if (state.status !== 'ready') return null;
  switch (metric) {
    case 'due':
      return state.stats.dueToday === 0 ? null : String(state.stats.dueToday);
    case 'streak':
      return state.stats.streak === 0 ? null : String(state.stats.streak);
    case 'sessions':
      return state.stats.totalSessions === 0 ? null : String(state.stats.totalSessions);
    case 'accuracy':
      // A brand new account has no accuracy, which is a different fact from
      // scoring zero. Neither one is a figure worth printing here.
      return state.stats.totalSessions === 0 ? null : `${state.stats.accuracy}%`;
  }
}

/**
 * One tile in a stats grid. Its resting state is its label and nothing else:
 * no zero, no "Loading", no word standing in the space a number would take.
 * A figure appears only once one has been fetched for this reader.
 *
 * The label lives inside the live region as well as under it, so the announced
 * text is "3 Day Streak" rather than a bare "3". It is in the region from the
 * first render, which means the region is never empty and the arriving value is
 * announced as a change to it. The reserved height keeps the tile from jumping
 * when that happens.
 */
export function HomeStatTile({
  metric,
  icon,
  iconWrapperClassName,
}: {
  metric: HomeStatMetric;
  icon: ReactNode;
  iconWrapperClassName: string;
}) {
  const state = useHomeStats();
  const value = metricValue(state, metric);
  const label = METRIC_LABELS[metric];

  return (
    <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
      <div className={iconWrapperClassName}>{icon}</div>
      <div
        className="text-2xl font-bold text-gray-900 mb-1 min-h-[2rem]"
        aria-live="polite"
      >
        {value}
        <span className="sr-only">{value ? ' ' : ''}{label}</span>
      </div>
      <div className="text-sm text-gray-600" aria-hidden="true">
        {label}
      </div>
    </div>
  );
}
