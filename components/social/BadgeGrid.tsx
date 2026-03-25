'use client';

import { Trophy, Flame, Target, Star, Swords, Zap } from 'lucide-react';

interface Badge {
  type: string;
  title: string;
  description: string;
  earnedAt?: string;
}

const badgeIcons: Record<string, React.ElementType> = {
  first_session: Star,
  streak_7: Flame,
  streak_30: Flame,
  perfect_score: Target,
  card_mastered: Zap,
  sessions_10: Trophy,
  sessions_50: Trophy,
  sessions_100: Trophy,
  cards_studied_100: Star,
  cards_studied_500: Star,
  versus_first_win: Swords,
  versus_wins_10: Swords,
  versus_wins_50: Swords,
  versus_perfect_score: Target,
  versus_streak_5: Flame,
  versus_streak_10: Flame,
};

const allBadges: { type: string; title: string; description: string }[] = [
  { type: 'first_session', title: 'First Steps', description: 'Complete your first study session' },
  { type: 'streak_7', title: '7-Day Streak', description: 'Study 7 days in a row' },
  { type: 'streak_30', title: '30-Day Streak', description: 'Study 30 days in a row' },
  { type: 'perfect_score', title: 'Perfect Score', description: 'Get 100% accuracy in a session' },
  { type: 'sessions_10', title: 'Dedicated Learner', description: 'Complete 10 study sessions' },
  { type: 'sessions_50', title: 'Study Pro', description: 'Complete 50 study sessions' },
  { type: 'versus_first_win', title: 'First Victory', description: 'Win your first versus challenge' },
  { type: 'versus_wins_10', title: 'Champion', description: 'Win 10 versus challenges' },
];

interface BadgeGridProps {
  earnedBadges: Badge[];
  showLocked?: boolean;
}

export default function BadgeGrid({ earnedBadges, showLocked = false }: BadgeGridProps) {
  const earnedTypes = new Set(earnedBadges.map(b => b.type));

  const displayBadges = showLocked
    ? allBadges.map(b => ({
        ...b,
        earned: earnedTypes.has(b.type),
        earnedAt: earnedBadges.find(e => e.type === b.type)?.earnedAt,
      }))
    : earnedBadges.map(b => ({ ...b, earned: true }));

  if (displayBadges.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">No achievements yet</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" role="list" aria-label="Achievement badges">
      {displayBadges.map(badge => {
        const Icon = badgeIcons[badge.type] || Trophy;
        return (
          <div
            key={badge.type}
            role="listitem"
            className={`flex flex-col items-center text-center p-3 rounded-lg border ${
              badge.earned
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-gray-50 border-gray-200 opacity-50'
            }`}
          >
            <Icon
              className={`h-6 w-6 mb-1 ${badge.earned ? 'text-yellow-500' : 'text-gray-400'}`}
              aria-hidden="true"
            />
            <p className={`text-xs font-medium ${badge.earned ? 'text-gray-900' : 'text-gray-500'}`}>
              {badge.title}
            </p>
            {badge.earned && badge.earnedAt && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {new Date(badge.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
