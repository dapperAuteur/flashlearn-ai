import { api } from '@/lib/api';

interface Participant {
  userName: string;
  rank: number;
  compositeScore: number;
  scoreBreakdown?: {
    accuracyScore: number;
    speedScore: number;
    confidenceScore: number;
    streakScore: number;
  };
  completedAt?: string;
}

export default async function ChallengeResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let participants: Participant[] = [];
  let setName = '';
  let error = '';

  try {
    const data = await api<{ setName: string; participants: Participant[] }>('GET', `/versus/challenges/${id}/board`);
    participants = data.participants;
    setName = data.setName;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load results';
  }

  if (error) return <p className="text-red-600 text-center py-12" role="alert">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Challenge Results</h1>
      <p className="text-sm text-gray-500 mb-6">{setName}</p>

      {participants.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No results yet. Waiting for players to complete.</p>
      ) : (
        <div className="space-y-3">
          {participants.map((p, i) => {
            const medal = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`;
            return (
              <div key={i} className={`bg-white border rounded-lg p-4 ${i === 0 ? 'border-yellow-300 bg-yellow-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{medal}</span>
                    <span className="font-medium text-gray-900">{p.userName}</span>
                  </div>
                  <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                    {p.compositeScore}
                  </span>
                </div>
                {p.scoreBreakdown && (
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                    <div>Accuracy: {p.scoreBreakdown.accuracyScore}/400</div>
                    <div>Speed: {p.scoreBreakdown.speedScore}/250</div>
                    <div>Confidence: {p.scoreBreakdown.confidenceScore}/200</div>
                    <div>Streak: {p.scoreBreakdown.streakScore}/150</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
