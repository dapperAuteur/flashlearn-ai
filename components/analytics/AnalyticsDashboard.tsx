'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  ChartBarIcon,
  FireIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

interface WeeklyData {
  week: string;
  accuracy: number;
  sessions: number;
  timeMinutes: number;
}

interface StreakDay {
  date: string;
  count: number;
}

interface ProblemCard {
  cardId: string;
  correct: number;
  incorrect: number;
  accuracy: number;
}

interface ConfidencePoint {
  confidence: number;
  accuracy: number;
  count: number;
}

interface DailyStudyTime {
  date: string;
  minutes: number;
  sessions: number;
}

interface Achievement {
  type: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
}

const ICON_MAP: Record<string, string> = {
  rocket: '\u{1F680}',
  fire: '\u{1F525}',
  star: '\u{2B50}',
  trophy: '\u{1F3C6}',
  book: '\u{1F4DA}',
  academic: '\u{1F393}',
  crown: '\u{1F451}',
  cards: '\u{1F0CF}',
  sparkles: '\u{2728}',
};

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [streakCalendar, setStreakCalendar] = useState<StreakDay[]>([]);
  const [problemCards, setProblemCards] = useState<ProblemCard[]>([]);
  const [confidenceAccuracy, setConfidenceAccuracy] = useState<ConfidencePoint[]>([]);
  const [dailyStudyTime, setDailyStudyTime] = useState<DailyStudyTime[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/study/analytics').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/study/achievements').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([analyticsData, achievementsData]) => {
        if (analyticsData) {
          setWeeklyData(analyticsData.weeklyData || []);
          setStreakCalendar(analyticsData.streakCalendar || []);
          setProblemCards(analyticsData.problemCards || []);
          setConfidenceAccuracy(analyticsData.confidenceAccuracy || []);
          setDailyStudyTime(analyticsData.dailyStudyTime || []);
        }
        if (achievementsData) {
          setAchievements(achievementsData.achievements || []);
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
      </div>
    );
  }

  const hasData = weeklyData.length > 0 || dailyStudyTime.length > 0;

  if (!hasData && achievements.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-base font-medium text-gray-900 mb-1">No analytics data yet</h3>
        <p className="text-sm text-gray-500">Complete some study sessions to see your performance analytics.</p>
      </div>
    );
  }

  // Weekly accuracy chart
  const accuracyChartData = {
    labels: weeklyData.map((w) => w.week),
    datasets: [
      {
        label: 'Accuracy %',
        data: weeklyData.map((w) => w.accuracy),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#3B82F6',
      },
    ],
  };

  // Daily study time chart
  const studyTimeChartData = {
    labels: dailyStudyTime.map((d) => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: 'Minutes',
        data: dailyStudyTime.map((d) => d.minutes),
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
        borderRadius: 4,
      },
    ],
  };

  // Confidence vs accuracy chart
  const confidenceChartData = {
    labels: confidenceAccuracy.map((c) => `Level ${c.confidence}`),
    datasets: [
      {
        label: 'Accuracy %',
        data: confidenceAccuracy.map((c) => c.accuracy),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#10B981',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v: number | string) => `${v}%` },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v: number | string) => `${v}m` },
      },
    },
  };

  // Build streak calendar (90-day grid)
  const streakCountMap = new Map(streakCalendar.map((d) => [d.date, d.count]));
  const calendarDays: { date: string; count: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    calendarDays.push({ date: key, count: streakCountMap.get(key) || 0 });
  }

  return (
    <div className="space-y-6">
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Accuracy */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-blue-600" />
            Weekly Accuracy
          </h3>
          {weeklyData.length > 0 ? (
            <div className="h-56">
              <Line data={accuracyChartData} options={chartOptions} />
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No weekly data yet</p>
          )}
        </div>

        {/* Daily Study Time */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FireIcon className="h-5 w-5 text-purple-600" />
            Daily Study Time
          </h3>
          {dailyStudyTime.length > 0 ? (
            <div className="h-56">
              <Bar data={studyTimeChartData} options={barOptions} />
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No study time data yet</p>
          )}
        </div>
      </div>

      {/* Confidence vs Accuracy */}
      {confidenceAccuracy.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Confidence vs Accuracy
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            How well does your confidence predict your actual performance?
          </p>
          <div className="h-48">
            <Line data={confidenceChartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Streak Calendar */}
      {streakCalendar.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FireIcon className="h-5 w-5 text-orange-500" />
            Study Streak (Last 90 Days)
          </h3>
          <div className="flex flex-wrap gap-1">
            {calendarDays.map((day) => (
              <div
                key={day.date}
                className={`w-3 h-3 rounded-sm ${
                  day.count === 0
                    ? 'bg-gray-100'
                    : day.count === 1
                      ? 'bg-green-200'
                      : day.count <= 3
                        ? 'bg-green-400'
                        : 'bg-green-600'
                }`}
                title={`${day.date}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-gray-100" />
            <div className="w-3 h-3 rounded-sm bg-green-200" />
            <div className="w-3 h-3 rounded-sm bg-green-400" />
            <div className="w-3 h-3 rounded-sm bg-green-600" />
            <span>More</span>
          </div>
        </div>
      )}

      {/* Problem Cards */}
      {problemCards.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            Problem Cards (Lowest Accuracy)
          </h3>
          <div className="space-y-2">
            {problemCards.map((card, i) => (
              <div key={card.cardId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-500 w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          card.accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${card.accuracy}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">
                      {card.accuracy}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {card.correct} correct / {card.incorrect} incorrect
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-amber-500" />
            Achievements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {achievements.map((a) => (
              <div
                key={a.type}
                className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl"
              >
                <span className="text-2xl">{ICON_MAP[(a as Achievement).icon] || '\u{1F3C6}'}</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{a.title}</p>
                  <p className="text-xs text-gray-600">{a.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(a.earnedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
