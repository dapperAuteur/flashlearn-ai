'use client';

import Link from 'next/link';
import {
  ClockIcon,
  UserGroupIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

interface Participant {
  userId: string;
  userName: string;
  status: string;
  compositeScore: number;
  rank: number;
}

interface Challenge {
  _id: string;
  challengeCode: string;
  setName: string;
  studyMode: string;
  status: 'pending' | 'active' | 'completed' | 'expired';
  participants: Participant[];
  maxParticipants: number;
  expiresAt: string;
  createdAt: string;
  scope: string;
}

interface ChallengeCardProps {
  challenge: Challenge;
  currentUserId: string;
}

function getTimeRemaining(expiresAt: string): string {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800' },
  active: { label: 'Active', classes: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', classes: 'bg-green-100 text-green-800' },
  expired: { label: 'Expired', classes: 'bg-gray-100 text-gray-600' },
};

export default function ChallengeCard({ challenge, currentUserId }: ChallengeCardProps) {
  const {
    _id,
    challengeCode,
    setName,
    studyMode,
    status,
    participants,
    maxParticipants,
    expiresAt,
  } = challenge;

  const currentParticipant = participants.find((p) => p.userId === currentUserId);
  const statusInfo = statusConfig[status] || statusConfig.expired;

  const href =
    status === 'completed'
      ? `/versus/results/${_id}`
      : status === 'active'
        ? `/versus/play/${_id}`
        : '#';

  return (
    <Link
      href={href}
      className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5"
    >
      {/* Top row: title + status badge */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{setName}</h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{challengeCode}</p>
        </div>
        <span
          className={`flex-shrink-0 ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.classes}`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
        <span className="inline-flex items-center gap-1">
          <UserGroupIcon className="h-4 w-4" />
          {participants.length}/{maxParticipants} players
        </span>

        {status === 'active' && (
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="h-4 w-4" />
            {getTimeRemaining(expiresAt)}
          </span>
        )}

        <span className="text-xs text-gray-400 capitalize">{studyMode}</span>
      </div>

      {/* Completed results for current user */}
      {status === 'completed' && currentParticipant && currentParticipant.rank > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
          <TrophyIcon className="h-5 w-5 text-amber-500" />
          <span className="text-sm font-medium text-gray-700">
            Rank #{currentParticipant.rank}
          </span>
          <span className="text-sm text-gray-500">
            Score: {currentParticipant.compositeScore}
          </span>
        </div>
      )}
    </Link>
  );
}
