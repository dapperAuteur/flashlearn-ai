'use client';

import { TrophyIcon } from '@heroicons/react/24/outline';

interface Participant {
  userId: string;
  userName: string;
  compositeScore: number;
  rank: number;
  status: string;
}

interface ScoreComparisonProps {
  participants: Participant[];
  currentUserId: string;
}

const MAX_SCORE = 1000;

function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-amber-400';
    case 2:
      return 'bg-gray-400';
    case 3:
      return 'bg-amber-700';
    default:
      return 'bg-gray-300';
  }
}

function getRankTextColor(rank: number): string {
  switch (rank) {
    case 1:
      return 'text-amber-600';
    case 2:
      return 'text-gray-500';
    case 3:
      return 'text-amber-800';
    default:
      return 'text-gray-500';
  }
}

function getRankBorderColor(rank: number): string {
  switch (rank) {
    case 1:
      return 'border-amber-300';
    case 2:
      return 'border-gray-300';
    case 3:
      return 'border-amber-600';
    default:
      return 'border-gray-200';
  }
}

export default function ScoreComparison({ participants, currentUserId }: ScoreComparisonProps) {
  const sorted = [...participants].sort((a, b) => {
    // Unfinished participants go to the bottom
    if (a.rank === 0 && b.rank === 0) return 0;
    if (a.rank === 0) return 1;
    if (b.rank === 0) return -1;
    return a.rank - b.rank;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrophyIcon className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-gray-900">Leaderboard</h3>
      </div>

      <div className="space-y-3">
        {sorted.map((participant) => {
          const isCurrentUser = participant.userId === currentUserId;
          const isFinished = participant.status === 'completed';
          const barWidth = isFinished
            ? Math.min((participant.compositeScore / MAX_SCORE) * 100, 100)
            : 0;

          return (
            <div
              key={participant.userId}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isCurrentUser
                  ? `${getRankBorderColor(participant.rank)} bg-blue-50`
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-8 text-center">
                {isFinished ? (
                  <span className={`text-lg font-bold ${getRankTextColor(participant.rank)}`}>
                    {participant.rank}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">--</span>
                )}
              </div>

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    isCurrentUser ? 'text-blue-700' : 'text-gray-800'
                  }`}
                >
                  {participant.userName}
                  {isCurrentUser && (
                    <span className="ml-1.5 text-xs text-blue-500 font-normal">(you)</span>
                  )}
                </p>

                {isFinished ? (
                  <div className="mt-1.5 w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${getRankColor(participant.rank)}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-400 italic">Did Not Finish</p>
                )}
              </div>

              {/* Score */}
              <div className="flex-shrink-0 text-right w-16">
                {isFinished ? (
                  <span className="text-sm font-semibold text-gray-700">
                    {participant.compositeScore}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">DNF</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
