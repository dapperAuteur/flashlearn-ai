'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ChartBarIcon,
  ClockIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * One student's progress, for a teacher, tutor, or guardian.
 *
 * It reads /api/teacher/students/:id/analytics, which answers only for someone
 * who could also study with that student. There is no chart here on purpose:
 * every number is text in a table, so it survives a phone screen, a screen
 * reader, and being read aloud to a class.
 *
 * The distinction the whole screen turns on is that "0%" and "nothing recorded
 * yet" are different statements. A student who has never studied gets an empty
 * state that says so, and any figure with nothing behind it says so in words
 * rather than showing a zero.
 */

interface Totals {
  sessions: number;
  cardsAnswered: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  timeStudiedSeconds: number;
  averageSessionScore: number | null;
}

interface RecentTotals {
  windowDays: number;
  sessions: number;
  cardsAnswered: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  timeStudiedSeconds: number;
}

interface SessionRow {
  id: string;
  setId: string | null;
  setName: string;
  startedAt: string | null;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  durationSeconds: number | null;
  studyMode: string | null;
  proctored: boolean;
}

interface SetRow {
  setId: string;
  setName: string;
  sessions: number;
  timeStudiedSeconds: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  averageScore: number | null;
  cardsTracked: number;
}

interface ProblemCard {
  cardId: string;
  setId: string;
  setName: string;
  front: string | null;
  correct: number;
  incorrect: number;
  accuracy: number;
  weakestMode: { mode: string; direction: string; accuracy: number } | null;
}

interface AnalyticsReport {
  student: { id: string; name: string; isManaged: boolean; isSelf: boolean };
  hasStudied: boolean;
  totals: Totals;
  recent: RecentTotals;
  sessions: SessionRow[];
  sets: SetRow[];
  problemCards: ProblemCard[];
}

interface StudentAnalyticsProps {
  studentId: string;
  /** Where the teacher came from, so the back link returns to that roster. */
  classroomId?: string | null;
}

const MODE_LABELS: Record<string, string> = {
  classic: 'Classic',
  'multiple-choice': 'Multiple choice',
  'type-answer': 'Type the answer',
};

const DIRECTION_LABELS: Record<string, string> = {
  'front-to-back': 'front to back',
  'back-to-front': 'back to front',
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Not recorded';
  if (seconds <= 0) return 'None yet';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatPercent(value: number | null, emptyText = 'No answers yet'): string {
  return value === null ? emptyText : `${value}%`;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Date not recorded';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date not recorded';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function modeLabel(mode: string, direction: string): string {
  return `${MODE_LABELS[mode] ?? mode}, ${DIRECTION_LABELS[direction] ?? direction}`;
}

/** Shared table shell, so every table on the page scrolls and reads the same way. */
function TableFrame({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

const headerCell =
  'text-left py-2 px-4 text-xs font-medium text-gray-700 uppercase tracking-wide whitespace-nowrap';
const numberCell = 'py-3 px-4 text-right text-gray-900 tabular-nums whitespace-nowrap';

export default function StudentAnalytics({ studentId, classroomId }: StudentAnalyticsProps) {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/teacher/students/${encodeURIComponent(studentId)}/analytics`);
      if (!res.ok) {
        let message = 'Could not load their progress.';
        try {
          const data = await res.json();
          if (typeof data?.error === 'string') message = data.error;
        } catch {
          // A response with no JSON body still needs to say something useful.
        }
        setLoadError(message);
        setReport(null);
        return;
      }
      const data = (await res.json()) as AnalyticsReport;
      setReport(data);
      setLoadError(null);
      setStatusMessage(`Progress for ${data.student.name} loaded.`);
    } catch (error) {
      Logger.warning(LogContext.SYSTEM, 'Could not load student analytics', { error });
      setLoadError('Could not load their progress. Check your connection and try again.');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const backHref = classroomId ? `/teacher/classrooms/${classroomId}` : '/teacher/classrooms';

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          {classroomId ? 'Back to the roster' : 'Back to classrooms'}
        </Link>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ChartBarIcon className="h-6 w-6 text-blue-600 flex-shrink-0" aria-hidden="true" />
          {report ? `${report.student.name}: progress` : 'Student progress'}
        </h1>
        {report?.student.isManaged && (
          <p className="mt-1 text-sm text-gray-700">
            This is a class account you created. It has no email address, so everything here was
            recorded in a session you ran together.
          </p>
        )}
      </div>

      {/* Always mounted, because a live region added at the same moment as its
          text is often not announced at all. */}
      <p role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>

      {isLoading ? (
        <div role="status" className="bg-white rounded-xl shadow p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-sm text-gray-700">Loading their progress...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <p role="alert" className="text-sm text-red-700">
            {loadError}
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-3 min-h-11 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-900 rounded-lg hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Try again
          </button>
        </div>
      ) : !report ? null : !report.hasStudied ? (
        <section
          aria-labelledby="no-study-heading"
          className="bg-white rounded-xl shadow px-4 sm:px-6 py-6"
        >
          <h2 id="no-study-heading" className="text-base font-semibold text-gray-900">
            No study sessions yet
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            {report.student.name} has not finished a study session, so there is nothing to score.
            This is not the same as a low score: there is no accuracy, no card record, and no time
            to report yet.
          </p>
          <p className="mt-2 text-sm text-gray-700">
            Numbers appear here after the first finished session, whether the student studies alone
            or you run the session together.
          </p>
          <Link
            href={`/study?studentId=${encodeURIComponent(report.student.id)}`}
            className="mt-4 min-h-12 inline-flex items-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <PlayIcon className="h-4 w-4" aria-hidden="true" />
            Start a session
            <span className="sr-only"> with {report.student.name}</span>
          </Link>
        </section>
      ) : (
        <>
          {/* Headline numbers */}
          <section aria-labelledby="summary-heading" className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <h2 id="summary-heading" className="text-base font-semibold text-gray-900">
                The short version
              </h2>
            </div>
            <dl className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
              <div className="bg-white px-4 sm:px-6 py-4">
                <dt className="text-sm text-gray-700">Accuracy, all time</dt>
                <dd className="text-2xl font-bold text-gray-900 tabular-nums">
                  {formatPercent(report.totals.accuracy)}
                </dd>
              </div>
              <div className="bg-white px-4 sm:px-6 py-4">
                <dt className="text-sm text-gray-700">
                  Accuracy, last {report.recent.windowDays} days
                </dt>
                <dd className="text-2xl font-bold text-gray-900 tabular-nums">
                  {formatPercent(report.recent.accuracy, 'No answers in this window')}
                </dd>
              </div>
              <div className="bg-white px-4 sm:px-6 py-4">
                <dt className="text-sm text-gray-700">Cards right</dt>
                <dd className="text-2xl font-bold text-green-800 tabular-nums">
                  {report.totals.correct}
                </dd>
              </div>
              <div className="bg-white px-4 sm:px-6 py-4">
                <dt className="text-sm text-gray-700">Cards wrong</dt>
                <dd className="text-2xl font-bold text-red-800 tabular-nums">
                  {report.totals.incorrect}
                </dd>
              </div>
              <div className="bg-white px-4 sm:px-6 py-4">
                <dt className="text-sm text-gray-700">Sessions finished</dt>
                <dd className="text-2xl font-bold text-gray-900 tabular-nums">
                  {report.totals.sessions}
                </dd>
              </div>
              <div className="bg-white px-4 sm:px-6 py-4">
                <dt className="text-sm text-gray-700">Time studied</dt>
                <dd className="text-2xl font-bold text-gray-900 tabular-nums">
                  {formatDuration(report.totals.timeStudiedSeconds)}
                </dd>
              </div>
            </dl>
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 text-sm text-gray-700 space-y-1">
              <p>
                Last {report.recent.windowDays} days: {report.recent.sessions}{' '}
                {report.recent.sessions === 1 ? 'session' : 'sessions'}, {report.recent.correct}{' '}
                right and {report.recent.incorrect} wrong, {formatDuration(report.recent.timeStudiedSeconds)}{' '}
                in session.
              </p>
              <p>
                Average session score:{' '}
                {formatPercent(report.totals.averageSessionScore, 'Not scored yet')}. This is the
                figure on the student&apos;s own dashboard, averaged per set, so it can differ slightly
                from the card accuracy above.
              </p>
            </div>
          </section>

          {/* Cards the student keeps missing */}
          <section aria-labelledby="cards-heading" className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <h2 id="cards-heading" className="text-base font-semibold text-gray-900">
                Cards to go over ({report.problemCards.length})
              </h2>
              <p className="mt-1 text-sm text-gray-700">
                Every card this student has answered wrong at least once, worst first.
              </p>
            </div>
            {report.problemCards.length === 0 ? (
              <p className="px-4 sm:px-6 py-6 text-sm text-gray-700">
                No card has been missed yet. Cards appear here the first time one is answered
                wrong.
              </p>
            ) : (
              <TableFrame>
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Cards {report.student.name} has answered wrong, with how often and in which
                    study mode, worst accuracy first.
                  </caption>
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className={headerCell}>
                        Card
                      </th>
                      <th scope="col" className={headerCell}>
                        Set
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Right
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Wrong
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Accuracy
                      </th>
                      <th scope="col" className={headerCell}>
                        Hardest mode
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.problemCards.map((card) => (
                      <tr key={`${card.setId}-${card.cardId}`}>
                        <th scope="row" className="py-3 px-4 text-left font-medium text-gray-900">
                          {card.front ?? 'This card has since been edited or removed'}
                        </th>
                        <td className="py-3 px-4 text-gray-700">{card.setName}</td>
                        <td className={numberCell}>{card.correct}</td>
                        <td className={numberCell}>{card.incorrect}</td>
                        <td className={`${numberCell} font-semibold`}>{card.accuracy}%</td>
                        <td className="py-3 px-4 text-gray-700">
                          {card.weakestMode
                            ? `${modeLabel(card.weakestMode.mode, card.weakestMode.direction)} (${card.weakestMode.accuracy}%)`
                            : 'Not recorded'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableFrame>
            )}
          </section>

          {/* Per set */}
          <section aria-labelledby="sets-heading" className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <h2 id="sets-heading" className="text-base font-semibold text-gray-900">
                By set ({report.sets.length})
              </h2>
              <p className="mt-1 text-sm text-gray-700">Weakest set first.</p>
            </div>
            {report.sets.length === 0 ? (
              <p className="px-4 sm:px-6 py-6 text-sm text-gray-700">
                No set has a record yet.
              </p>
            ) : (
              <TableFrame>
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    How {report.student.name} is doing in each flashcard set, weakest accuracy
                    first.
                  </caption>
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className={headerCell}>
                        Set
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Accuracy
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Right
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Wrong
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Sessions
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Time
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Cards seen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.sets.map((row) => (
                      <tr key={row.setId}>
                        <th scope="row" className="py-3 px-4 text-left font-medium text-gray-900">
                          {row.setName}
                        </th>
                        <td className={`${numberCell} font-semibold`}>
                          {formatPercent(row.accuracy)}
                        </td>
                        <td className={numberCell}>{row.correct}</td>
                        <td className={numberCell}>{row.incorrect}</td>
                        <td className={numberCell}>{row.sessions}</td>
                        <td className={numberCell}>{formatDuration(row.timeStudiedSeconds)}</td>
                        <td className={numberCell}>{row.cardsTracked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableFrame>
            )}
          </section>

          {/* Recent sessions */}
          <section
            aria-labelledby="sessions-heading"
            className="bg-white rounded-xl shadow overflow-hidden"
          >
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-600" aria-hidden="true" />
              <h2 id="sessions-heading" className="text-base font-semibold text-gray-900">
                Recent sessions ({report.sessions.length})
              </h2>
            </div>
            {report.sessions.length === 0 ? (
              <p className="px-4 sm:px-6 py-6 text-sm text-gray-700">
                No finished sessions to list.
              </p>
            ) : (
              <TableFrame>
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    The most recent finished study sessions for {report.student.name}, newest
                    first.
                  </caption>
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className={headerCell}>
                        Date
                      </th>
                      <th scope="col" className={headerCell}>
                        Set
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Right
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Wrong
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Accuracy
                      </th>
                      <th scope="col" className={`${headerCell} text-right`}>
                        Time
                      </th>
                      <th scope="col" className={headerCell}>
                        Studied
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.sessions.map((row) => {
                      const clock = formatTime(row.startedAt);
                      return (
                        <tr key={row.id}>
                          <th scope="row" className="py-3 px-4 text-left font-medium text-gray-900">
                            {formatDate(row.startedAt)}
                            {clock && (
                              <span className="block text-xs font-normal text-gray-700">{clock}</span>
                            )}
                          </th>
                          <td className="py-3 px-4 text-gray-700">
                            {row.setName}
                            {row.studyMode && (
                              <span className="block text-xs text-gray-700">
                                {MODE_LABELS[row.studyMode] ?? row.studyMode}
                              </span>
                            )}
                          </td>
                          <td className={numberCell}>{row.correct}</td>
                          <td className={numberCell}>{row.incorrect}</td>
                          <td className={`${numberCell} font-semibold`}>
                            {formatPercent(row.accuracy)}
                          </td>
                          <td className={numberCell}>{formatDuration(row.durationSeconds)}</td>
                          <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                            {row.proctored ? 'With an adult' : 'On their own'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableFrame>
            )}
          </section>

          <section aria-labelledby="sources-heading" className="bg-white rounded-xl shadow px-4 sm:px-6 py-4">
            <h2 id="sources-heading" className="text-sm font-semibold text-gray-900">
              Where these numbers come from
            </h2>
            <p className="mt-1 text-sm text-gray-700">
              Session counts, card counts, and dates are read from the student&apos;s finished study
              sessions. Time studied, the per-set record, and the per-card record are read from the
              same store their own progress page uses, so you and the student are looking at the
              same figures. A session an adult ran counts toward the student, never toward the
              adult.
            </p>
            <p className="mt-3">
              <Link
                href={`/study?studentId=${encodeURIComponent(report.student.id)}`}
                className="min-h-11 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <PlayIcon className="h-4 w-4" aria-hidden="true" />
                Start a session
                <span className="sr-only"> with {report.student.name}</span>
              </Link>
            </p>
          </section>
        </>
      )}
    </div>
  );
}
