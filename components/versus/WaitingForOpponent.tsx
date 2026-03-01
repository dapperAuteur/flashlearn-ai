'use client';

import { useEffect } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface Participant {
  userId: string;
  userName: string;
  compositeScore?: number;
  rank?: number;
  status: string;
}

interface WaitingForOpponentProps {
  participants: Participant[];
  currentUserId: string;
  onRefresh: () => void;
}

export default function WaitingForOpponent({
  participants,
  currentUserId,
  onRefresh,
}: WaitingForOpponentProps) {
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [onRefresh]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Waiting message */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <ClockIcon className="h-8 w-8 text-blue-600 animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          Waiting for opponents
          <span className="inline-block animate-pulse">...</span>
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Results will appear once everyone has finished
        </p>
      </div>

      {/* Participant status list */}
      <div className="space-y-2 mb-6">
        {participants.map((participant) => {
          const isCurrentUser = participant.userId === currentUserId;
          const isCompleted = participant.status === 'completed';

          return (
            <div
              key={participant.userId}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                isCurrentUser ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
              }`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <ClockIcon className="h-5 w-5 text-amber-500" />
                )}
              </div>

              {/* Name */}
              <span
                className={`flex-1 text-sm font-medium truncate ${
                  isCurrentUser ? 'text-blue-700' : 'text-gray-800'
                }`}
              >
                {participant.userName}
                {isCurrentUser && (
                  <span className="ml-1.5 text-xs text-blue-500 font-normal">(you)</span>
                )}
              </span>

              {/* Status label */}
              <span
                className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                  isCompleted
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isCompleted ? 'Finished' : 'In Progress'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Refresh button */}
      <div className="text-center">
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
        <p className="text-xs text-gray-400 mt-2">Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}
