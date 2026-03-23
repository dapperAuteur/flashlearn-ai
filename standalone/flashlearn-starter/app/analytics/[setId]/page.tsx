import { api } from '@/lib/api';

interface CardAnalytics {
  cardId: string;
  correctCount: number;
  incorrectCount: number;
  totalTimeStudied: number;
  sm2: { easinessFactor: number; interval: number; repetitions: number; nextReviewDate: string | null };
}

export default async function AnalyticsPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  let cards: CardAnalytics[] = [];
  let error = '';

  try {
    const data = await api<{ analytics: { cards: CardAnalytics[] } | null }>('GET', `/study/analytics/${setId}`);
    cards = data.analytics?.cards || [];
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load analytics';
  }

  if (error) return <p className="text-red-600" role="alert">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Study Analytics</h1>

      {cards.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No study data yet. Complete a study session first.</p>
      ) : (
        <div className="space-y-3">
          {cards.map(card => {
            const total = card.correctCount + card.incorrectCount;
            const accuracy = total > 0 ? Math.round((card.correctCount / total) * 100) : 0;
            const isStruggling = card.sm2.easinessFactor < 2.0;

            return (
              <div key={card.cardId} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-mono">{card.cardId.slice(-6)}</span>
                  {isStruggling && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Needs work</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Accuracy</p>
                    <p className="font-semibold" style={{ color: accuracy >= 70 ? '#22c55e' : '#ef4444' }}>{accuracy}%</p>
                    <p className="text-xs text-gray-400">{card.correctCount}W / {card.incorrectCount}L</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Easiness</p>
                    <p className="font-semibold text-gray-900">{card.sm2.easinessFactor.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Interval</p>
                    <p className="font-semibold text-gray-900">{card.sm2.interval} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Next Review</p>
                    <p className="font-semibold text-gray-900">
                      {card.sm2.nextReviewDate
                        ? new Date(card.sm2.nextReviewDate).toLocaleDateString()
                        : 'Now'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
