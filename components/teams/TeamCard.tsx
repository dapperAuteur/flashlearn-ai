'use client';

import Link from 'next/link';
import { Users, Crown, Shield, User } from 'lucide-react';

interface Team {
  _id: string;
  name: string;
  description?: string;
  memberCount: number;
  role: 'owner' | 'admin' | 'member';
  joinCode: string;
}

interface TeamCardProps {
  team: Team;
}

const roleBadge: Record<string, { label: string; classes: string; icon: React.ElementType }> = {
  owner: { label: 'Owner', classes: 'bg-amber-100 text-amber-800', icon: Crown },
  admin: { label: 'Admin', classes: 'bg-blue-100 text-blue-800', icon: Shield },
  member: { label: 'Member', classes: 'bg-gray-100 text-gray-700', icon: User },
};

export default function TeamCard({ team }: TeamCardProps) {
  const badge = roleBadge[team.role] || roleBadge.member;
  const BadgeIcon = badge.icon;

  return (
    <article
      role="listitem"
      aria-label={`Team: ${team.name}`}
      className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5"
    >
      <Link href={`/team/${team._id}`} className="block">
        {/* Top row: name + role badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">
              {team.name}
            </h3>
          </div>
          <span
            className={`flex-shrink-0 ml-3 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}
          >
            <BadgeIcon className="h-3 w-3" aria-hidden="true" />
            {badge.label}
          </span>
        </div>

        {/* Description */}
        {team.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{team.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4" aria-hidden="true" />
            {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
          </span>
          <span className="text-xs font-mono text-gray-400">{team.joinCode}</span>
        </div>
      </Link>
    </article>
  );
}
