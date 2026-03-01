'use client';

interface ScoreBreakdown {
  accuracyScore: number;
  speedScore: number;
  confidenceScore: number;
  streakScore: number;
  totalScore: number;
  accuracy: number;
  averageTimeSeconds: number;
  longestStreak: number;
  confidenceCalibration: number;
}

interface CompositeScoreBreakdownProps {
  score: ScoreBreakdown;
}

interface ScoreCategory {
  label: string;
  value: number;
  max: number;
  color: string;
  bgColor: string;
  detail: string;
}

export default function CompositeScoreBreakdown({ score }: CompositeScoreBreakdownProps) {
  const categories: ScoreCategory[] = [
    {
      label: 'Accuracy',
      value: score.accuracyScore,
      max: 400,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100',
      detail: `${(score.accuracy * 100).toFixed(0)}% correct`,
    },
    {
      label: 'Speed',
      value: score.speedScore,
      max: 250,
      color: 'bg-green-500',
      bgColor: 'bg-green-100',
      detail: `${score.averageTimeSeconds.toFixed(1)}s avg`,
    },
    {
      label: 'Confidence',
      value: score.confidenceScore,
      max: 200,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-100',
      detail: `${(score.confidenceCalibration * 100).toFixed(0)}% calibrated`,
    },
    {
      label: 'Streak',
      value: score.streakScore,
      max: 150,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-100',
      detail: `${score.longestStreak} longest streak`,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {/* Total score */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Total Score</p>
        <p className="text-5xl font-bold text-gray-900 mt-1">{score.totalScore}</p>
        <p className="text-sm text-gray-400 mt-1">out of 1000</p>
      </div>

      {/* Category bars */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const pct = Math.min((cat.value / cat.max) * 100, 100);

          return (
            <div key={cat.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                <span className="text-sm text-gray-500">
                  {cat.value} / {cat.max}
                </span>
              </div>
              <div className={`w-full ${cat.bgColor} rounded-full h-3`}>
                <div
                  className={`h-3 rounded-full ${cat.color} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{cat.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
