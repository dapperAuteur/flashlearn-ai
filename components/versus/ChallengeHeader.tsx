'use client';

import { UserGroupIcon } from '@heroicons/react/24/outline';

interface ChallengeHeaderProps {
  challengeCode: string;
  setName: string;
  participantCount: number;
  studyMode: string;
}

export default function ChallengeHeader({
  challengeCode,
  setName,
  participantCount,
  studyMode,
}: ChallengeHeaderProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: VS badge + challenge info */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
            VS
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{setName}</h2>
            <p className="text-xs text-gray-400 font-mono">{challengeCode}</p>
          </div>
        </div>

        {/* Right: meta */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1">
            <UserGroupIcon className="h-4 w-4" />
            {participantCount} player{participantCount !== 1 ? 's' : ''}
          </span>
          <span className="capitalize text-xs bg-gray-100 px-2 py-1 rounded-md">{studyMode}</span>
        </div>
      </div>
    </div>
  );
}
