'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Users,
  BookOpen,
  Trophy,
  MessageCircle,
  LayoutDashboard,
  Copy,
  Check,
  Shield,
  Crown,
  User,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import TeamChat from '@/components/teams/TeamChat';

interface TeamMember {
  userId: string;
  userName: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

interface FlashcardSet {
  _id: string;
  title: string;
  cardCount: number;
  sharedBy: string;
  sharedAt: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  sessionsCompleted: number;
  averageAccuracy: number;
}

interface Team {
  _id: string;
  name: string;
  description?: string;
  joinCode: string;
  memberCount: number;
  isPublic: boolean;
  tags?: string[];
  members: TeamMember[];
  currentUserRole: 'owner' | 'admin' | 'member';
}

type TabId = 'overview' | 'sets' | 'members' | 'leaderboard' | 'chat';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'sets', label: 'Sets', icon: BookOpen },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
];

const roleBadge: Record<string, { label: string; classes: string; icon: React.ElementType }> = {
  owner: { label: 'Owner', classes: 'bg-amber-100 text-amber-800', icon: Crown },
  admin: { label: 'Admin', classes: 'bg-blue-100 text-blue-800', icon: Shield },
  member: { label: 'Member', classes: 'bg-gray-100 text-gray-700', icon: User },
};

export default function TeamDashboardPage() {
  const params = useParams();
  const teamId = params.id as string;
  const { status } = useSession();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [team, setTeam] = useState<Team | null>(null);
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}?_t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to load team');
      const data = await res.json();
      setTeam(data.team);
    } catch {
      setError('Failed to load team. Please try again.');
    }
  }, [teamId]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const load = async () => {
      setIsLoading(true);
      await fetchTeam();
      setIsLoading(false);
    };
    load();
  }, [status, fetchTeam]);

  // Fetch tab-specific data
  useEffect(() => {
    if (!team) return;

    if (activeTab === 'sets') {
      fetch(`/api/teams/${teamId}/sets?_t=${Date.now()}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setSets(data.sets || []))
        .catch(() => setSets([]));
    }

    if (activeTab === 'leaderboard') {
      fetch(`/api/teams/${teamId}/leaderboard?_t=${Date.now()}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setLeaderboard(data.leaderboard || []))
        .catch(() => setLeaderboard([]));
    }
  }, [activeTab, team, teamId]);

  const copyJoinCode = async () => {
    if (!team) return;
    try {
      await navigator.clipboard.writeText(team.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    setRoleChanging(userId);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        await fetchTeam();
      }
    } catch {
      // silently fail
    } finally {
      setRoleChanging(null);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-600">Loading team...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600">{error || 'Team not found.'}</p>
          <Link
            href="/team"
            className="mt-4 inline-flex items-center min-h-[44px] text-sm text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
            Back to Teams
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = team.currentUserRole === 'owner' || team.currentUserRole === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 -m-4 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <div className="space-y-6">
        {/* Back link */}
        <div className="flex items-center justify-between">
          <Link
            href="/team"
            className="inline-flex items-center min-h-[44px] text-sm text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Back to My Teams"
          >
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
            Back to Teams
          </Link>
          {isAdmin && (
            <Link
              href={`/team/${teamId}/settings`}
              className="inline-flex items-center min-h-[44px] text-sm text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Team settings"
            >
              <Settings className="h-4 w-4 mr-1" aria-hidden="true" />
              Settings
            </Link>
          )}
        </div>

        {/* Team Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Avatar placeholder */}
            <div
              className="flex-shrink-0 h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-2xl font-bold text-white">
                {team.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{team.name}</h1>
              {team.description && (
                <p className="mt-1 text-sm text-gray-600">{team.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                </span>
                {team.tags && team.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {team.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Join Code */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Join Code:</span>
              <code className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                {team.joinCode}
              </code>
              <button
                type="button"
                onClick={copyJoinCode}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Copy join code to clipboard"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              {copied && <span className="text-xs text-green-600">Copied!</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100" role="tablist" aria-label="Team sections">
          <div className="flex overflow-x-auto border-b border-gray-100">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={activeTab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setActiveTab(id)}
                className={`min-h-[44px] flex-shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Panels */}
          <div className="p-5">
            {/* Overview */}
            <div
              role="tabpanel"
              id="panel-overview"
              aria-labelledby="tab-overview"
              hidden={activeTab !== 'overview'}
            >
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <Users className="h-6 w-6 text-blue-500 mx-auto mb-1" aria-hidden="true" />
                      <p className="text-lg font-bold text-gray-900">{team.memberCount}</p>
                      <p className="text-xs text-gray-500">Members</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <BookOpen className="h-6 w-6 text-green-500 mx-auto mb-1" aria-hidden="true" />
                      <p className="text-lg font-bold text-gray-900">{sets.length || '--'}</p>
                      <p className="text-xs text-gray-500">Shared Sets</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <Trophy className="h-6 w-6 text-amber-500 mx-auto mb-1" aria-hidden="true" />
                      <p className="text-lg font-bold text-gray-900">--</p>
                      <p className="text-xs text-gray-500">Challenges</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">About</h3>
                    <p className="text-sm text-gray-600">
                      {team.description || 'No description provided.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sets */}
            <div
              role="tabpanel"
              id="panel-sets"
              aria-labelledby="tab-sets"
              hidden={activeTab !== 'sets'}
            >
              {activeTab === 'sets' && (
                <>
                  {sets.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                      <p className="text-sm text-gray-500">No shared flashcard sets yet.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Share a set to start studying together.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sets.map((set) => (
                        <article
                          key={set._id}
                          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4"
                          role="article"
                          aria-label={`Flashcard set: ${set.title}`}
                        >
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{set.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {set.cardCount} card{set.cardCount !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Shared by {set.sharedBy}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Members */}
            <div
              role="tabpanel"
              id="panel-members"
              aria-labelledby="tab-members"
              hidden={activeTab !== 'members'}
            >
              {activeTab === 'members' && (
                <div className="space-y-2">
                  {team.members && team.members.length > 0 ? (
                    <ul className="divide-y divide-gray-100" role="list" aria-label="Team members">
                      {team.members.map((member) => {
                        const badge = roleBadge[member.role] || roleBadge.member;
                        const BadgeIcon = badge.icon;
                        return (
                          <li
                            key={member.userId}
                            className="flex items-center justify-between py-3"
                            role="listitem"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center"
                                aria-hidden="true"
                              >
                                <span className="text-sm font-medium text-white">
                                  {member.userName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {member.userName}
                                </p>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}
                                >
                                  <BadgeIcon className="h-3 w-3" aria-hidden="true" />
                                  {badge.label}
                                </span>
                              </div>
                            </div>
                            {isAdmin && member.role !== 'owner' && (
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleRoleChange(member.userId, e.target.value as 'admin' | 'member')
                                }
                                disabled={roleChanging === member.userId}
                                className="min-h-[44px] text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label={`Change role for ${member.userName}`}
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                      <p className="text-sm text-gray-500">No members found.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Leaderboard */}
            <div
              role="tabpanel"
              id="panel-leaderboard"
              aria-labelledby="tab-leaderboard"
              hidden={activeTab !== 'leaderboard'}
            >
              {activeTab === 'leaderboard' && (
                <>
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                      <p className="text-sm text-gray-500">No leaderboard data yet.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Start studying to appear on the leaderboard.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" role="table" aria-label="Team leaderboard">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Rank
                            </th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Name
                            </th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Score
                            </th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                              Sessions
                            </th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                              Accuracy
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {leaderboard.map((entry) => (
                            <tr key={entry.userId} className="hover:bg-gray-50">
                              <td className="py-3 px-3 font-medium text-gray-900">
                                {entry.rank <= 3 ? (
                                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                                    {entry.rank}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">#{entry.rank}</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-gray-900">{entry.userName}</td>
                              <td className="py-3 px-3 text-right font-semibold text-gray-900">
                                {entry.score}
                              </td>
                              <td className="py-3 px-3 text-right text-gray-600 hidden sm:table-cell">
                                {entry.sessionsCompleted}
                              </td>
                              <td className="py-3 px-3 text-right text-gray-600 hidden sm:table-cell">
                                {entry.averageAccuracy}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Chat */}
            <div
              role="tabpanel"
              id="panel-chat"
              aria-labelledby="tab-chat"
              hidden={activeTab !== 'chat'}
            >
              {activeTab === 'chat' && <TeamChat teamId={teamId} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
