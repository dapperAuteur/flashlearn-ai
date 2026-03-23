import { api } from '@/lib/api';

interface Stats {
  totalChallenges: number;
  wins: number;
  losses: number;
  draws: number;
  currentWinStreak: number;
  bestWinStreak: number;
  averageCompositeScore: number;
  highestCompositeScore: number;
  rating: number;
}

export default async function StatsPage() {
  let stats: Stats = { totalChallenges: 0, wins: 0, losses: 0, draws: 0, currentWinStreak: 0, bestWinStreak: 0, averageCompositeScore: 0, highestCompositeScore: 0, rating: 1000 };
  try {
    const data = await api<{ stats: Stats }>('GET', '/versus/stats');
    stats = data.stats;
  } catch { /* empty */ }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Versus Stats</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Rating" value={stats.rating} />
        <StatCard label="Challenges" value={stats.totalChallenges} />
        <StatCard label="Wins" value={stats.wins} />
        <StatCard label="Losses" value={stats.losses} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Draws" value={stats.draws} />
        <StatCard label="Win Streak" value={stats.currentWinStreak} />
        <StatCard label="Best Streak" value={stats.bestWinStreak} />
        <StatCard label="Best Score" value={stats.highestCompositeScore} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-lg p-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
