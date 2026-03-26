'use client';

import { useState, useEffect } from 'react';
import { Flame, Target, Trophy } from 'lucide-react';

interface DailyGoalProps {
  dailyTarget?: number;
}

interface DailyStats {
  cardsStudiedToday: number;
  currentStreak: number;
  todaySessions: number;
}

export default function DailyGoal({ dailyTarget = 20 }: DailyGoalProps) {
  const [stats, setStats] = useState<DailyStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/study/daily-stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch { /* non-critical */ }
    };
    fetchStats();
  }, []);

  const cardsStudied = stats?.cardsStudiedToday ?? 0;
  const streak = stats?.currentStreak ?? 0;
  const progress = Math.min(100, (cardsStudied / dailyTarget) * 100);
  const goalMet = cardsStudied >= dailyTarget;

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-colors ${
        goalMet
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200'
      }`}
      role="region"
      aria-label="Daily study goal"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className={`h-5 w-5 ${goalMet ? 'text-green-600' : 'text-blue-600'}`} aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-900">Daily Goal</h3>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1" aria-label={`${streak} day streak`}>
            <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
            <span className="text-sm font-bold text-orange-600">{streak}</span>
            <span className="text-xs text-gray-500 hidden sm:inline">day{streak !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-3 mb-2" role="progressbar" aria-valuenow={cardsStudied} aria-valuemin={0} aria-valuemax={dailyTarget} aria-label={`${cardsStudied} of ${dailyTarget} cards studied today`}>
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            goalMet ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{cardsStudied}</span>
          {' / '}{dailyTarget} cards
        </p>
        {goalMet ? (
          <div className="flex items-center gap-1 text-green-600">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-semibold">Goal met!</span>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            {dailyTarget - cardsStudied} more to go
          </p>
        )}
      </div>
    </div>
  );
}
