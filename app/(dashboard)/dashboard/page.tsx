'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatisticCard from '@/components/ui/StatisticCard';
import { useSession } from 'next-auth/react';
import { useFlashcards } from '@/contexts/FlashcardContext';

import {
  BookOpenIcon,
  ClockIcon,
  FireIcon,
  CheckCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import ReviewSchedule from '@/components/dashboard/ReviewSchedule';
import { getSubscriptionDisplay, shouldShowUpgradeCTA } from '@/lib/utils/subscription';

interface StudyStats {
  totalSessions: number;
  totalTimeStudied: number;
  overallAccuracy: number;
  streak: number;
  todaySessions: number;
}

interface HistorySession {
  sessionId: string;
  setId: string;
  setName: string;
  startTime: string;
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  studyDirection: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const { flashcardSets } = useFlashcards();

  const [stats, setStats] = useState<StudyStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<HistorySession[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchData = async () => {
      setIsLoadingStats(true);
      try {
        const cacheBust = `_t=${Date.now()}`;
        const [statsRes, historyRes] = await Promise.all([
          fetch(`/api/study/stats?${cacheBust}`),
          fetch(`/api/study/history?limit=5&${cacheBust}`),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (historyRes.ok) {
          const data = await historyRes.json();
          setRecentSessions(data.sessions || []);
        }
      } catch {
        // Silently fail — stats will show defaults
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchData();
  }, [status]);

  const totalFlashcards = flashcardSets.reduce(
    (sum, s) => sum + (s.card_count || 0),
    0,
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Welcome, {user.name}!
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {stats?.todaySessions
            ? `${stats.todaySessions} session${stats.todaySessions !== 1 ? 's' : ''} completed today.`
            : 'Start studying to build your streak.'}
        </p>
      </div>

      {/* Review Schedule */}
      <ReviewSchedule />

      {/* Statistics */}
      <div data-onboarding="stats">
        <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3">
          Your Statistics
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatisticCard
            title="Total Flashcards"
            value={totalFlashcards}
            icon={<BookOpenIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
            linkHref="/flashcards"
            linkText="View all"
            color="blue"
          />
          <StatisticCard
            title="Study Sessions"
            value={isLoadingStats ? '...' : (stats?.totalSessions ?? 0)}
            icon={<ClockIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
            linkHref="/study"
            linkText="Start studying"
            color="green"
          />
          <StatisticCard
            title="Current Streak"
            value={isLoadingStats ? '...' : (stats?.streak ?? 0)}
            description="days in a row"
            icon={<FireIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
            color="purple"
          />
          <StatisticCard
            title="Correct Rate"
            value={
              isLoadingStats
                ? '...'
                : stats?.overallAccuracy
                  ? `${stats.overallAccuracy}%`
                  : '0%'
            }
            icon={<CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6" />}
            linkHref="/analytics"
            linkText="View details"
            color="yellow"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div data-onboarding="actions">
        <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/generate"
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
            Create Flashcard
          </Link>
          <Link
            href="/generate"
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
            Import Flashcards
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Start Studying
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-medium text-gray-900">
            Recent Activity
          </h2>
          {recentSessions.length > 0 && (
            <Link
              href="/analytics"
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all
            </Link>
          )}
        </div>

        {isLoadingStats ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
          </div>
        ) : recentSessions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-500">
              No study sessions yet. Start studying to see your history here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentSessions.map((s) => (
              <li key={s.sessionId}>
                <Link
                  href={`/results/${s.sessionId}`}
                  className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Accuracy indicator */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                      s.accuracy >= 80
                        ? 'bg-green-100 text-green-700'
                        : s.accuracy >= 50
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {s.accuracy}%
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {s.setName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.correctCount}/{s.totalCards} correct
                    </p>
                  </div>

                  {/* Time */}
                  <span className="flex-shrink-0 text-xs text-gray-500">
                    {formatDate(s.startTime)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Subscription Status */}
      <div className="bg-white shadow rounded-xl p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
          Your Subscription
        </h2>
        <p className="text-sm text-gray-600">
          {getSubscriptionDisplay(user.role, user.subscriptionTier)}
        </p>
        {shouldShowUpgradeCTA(user.role, user.subscriptionTier) && (
          <div className="mt-3">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors"
            >
              Upgrade to Premium
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
