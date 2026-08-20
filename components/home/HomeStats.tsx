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
 * 2. Nothing renders a number it does not have. Loading says it is loading,
 *    an empty account gets copy written for zero, and a failed fetch drops the
 *    figure instead of inventing one.
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

export function dueCardsCopy(state: HomeStatsState): string {
  if (state.status === 'loading') return 'Checking what is ready for review';
  if (state.status === 'error') return 'Pick up where you left off';
  if (state.stats.dueToday === 0) {
    return 'Nothing is due today. Study ahead any time.';
  }
  const count = state.stats.dueToday;
  return `Review ${count} card${count === 1 ? '' : 's'} due for optimal retention`;
}

export function accuracyCopy(state: HomeStatsState): string {
  if (state.status === 'loading') return 'Checking your results';
  if (state.status === 'error') return 'Track your learning stats';
  if (state.stats.totalSessions === 0) {
    return 'Study a set to start tracking your accuracy';
  }
  return `${state.stats.accuracy}% average accuracy across your sessions`;
}

export function streakCopy(state: HomeStatsState): string | null {
  if (state.status === 'loading') return 'Checking your study streak';
  if (state.status === 'error') return null;
  if (state.stats.streak === 0) {
    return 'Study today to start your streak';
  }
  return `${state.stats.streak}-day study streak! Keep it up!`;
}

/**
 * A value that arrives after render has to be announced, not silently swapped
 * in, so every one of these sits in a polite live region. The loading text is
 * the region's initial content, which screen readers do not announce as a
 * change, and it is words rather than a digit either way.
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

  let copy: string;
  if (state.status === 'ready' && state.stats.streak > 0) {
    copy = `You are on a ${state.stats.streak}-day streak. Keep the momentum going with your personalized study session.`;
  } else if (state.status === 'ready') {
    copy = 'Start your streak today with a personalized study session.';
  } else {
    copy = 'Keep the momentum going with your personalized study session.';
  }

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
      return String(state.stats.dueToday);
    case 'streak':
      return String(state.stats.streak);
    case 'sessions':
      return String(state.stats.totalSessions);
    case 'accuracy':
      // A brand new account has no accuracy, which is a different fact from
      // scoring zero, so the tile says so in words instead of printing "0%".
      return state.stats.totalSessions === 0 ? null : `${state.stats.accuracy}%`;
  }
}

/**
 * One tile in a stats grid. With no value to show it prints a short phrase
 * rather than a figure, so the tile never reads as the number zero when the
 * truth is "not known yet".
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

  let placeholder = 'None yet';
  if (state.status === 'loading') placeholder = 'Loading';
  else if (state.status === 'error') placeholder = 'Unavailable';

  return (
    <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
      <div className={iconWrapperClassName}>{icon}</div>
      <div
        className={`font-bold text-gray-900 mb-1 ${value === null ? 'text-base text-gray-500' : 'text-2xl'}`}
        aria-live="polite"
      >
        {value ?? placeholder}
        {/* Keeps the announcement meaningful: a live region reads only its own
            text, so "24" alone would arrive without saying 24 of what. */}
        <span className="sr-only"> {label}</span>
      </div>
      <div className="text-sm text-gray-600" aria-hidden="true">
        {label}
      </div>
    </div>
  );
}
