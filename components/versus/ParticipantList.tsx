'use client';

import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface Participant {
  userId: string;
  userName: string;
  status: string;
  compositeScore?: number;
  rank?: number;
}

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string;
  maxParticipants?: number;
}

const statusConfig: Record<string, { label: string; icon: 'check' | 'clock' | 'x'; classes: string }> = {
  accepted: { label: 'Accepted', icon: 'check', classes: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', icon: 'check', classes: 'bg-green-100 text-green-700' },
  declined: { label: 'Declined', icon: 'x', classes: 'bg-red-100 text-red-700' },
  pending: { label: 'Pending', icon: 'clock', classes: 'bg-amber-100 text-amber-700' },
};

function StatusIcon({ type }: { type: 'check' | 'clock' | 'x' }) {
  switch (type) {
    case 'check':
      return <CheckCircleIcon className="h-4 w-4" />;
    case 'clock':
      return <ClockIcon className="h-4 w-4" />;
    case 'x':
      return <XCircleIcon className="h-4 w-4" />;
  }
}

export default function ParticipantList({
  participants,
  currentUserId,
  maxParticipants,
}: ParticipantListProps) {
  const openSlots = maxParticipants != null ? Math.max(0, maxParticipants - participants.length) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Participants ({participants.length}{maxParticipants != null ? `/${maxParticipants}` : ''})
      </h3>

      <div className="space-y-2">
        {/* Existing participants */}
        {participants.map((participant) => {
          const isCurrentUser = participant.userId === currentUserId;
          const config = statusConfig[participant.status] || statusConfig.pending;

          return (
            <div
              key={participant.userId}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                isCurrentUser ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
              }`}
            >
              {/* Avatar placeholder */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isCurrentUser ? 'bg-blue-200' : 'bg-gray-200'
                }`}
              >
                <UserIcon
                  className={`h-4 w-4 ${isCurrentUser ? 'text-blue-700' : 'text-gray-600'}`}
                />
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

              {/* Status badge */}
              <span
                className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.classes}`}
              >
                <StatusIcon type={config.icon} />
                {config.label}
              </span>
            </div>
          );
        })}

        {/* Open slots */}
        {Array.from({ length: openSlots }).map((_, i) => (
          <div
            key={`open-${i}`}
            className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-gray-300" />
            </div>
            <span className="text-sm text-gray-400 italic">Open</span>
          </div>
        ))}
      </div>
    </div>
  );
}
