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
  Mail,
  Activity,
  Sparkles,
  Award,
  Swords,
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
  rating: number;
  wins: number;
  studySessions?: number;
  totalChallenges?: number;
}

type LeaderboardScope = 'group' | 'global';

// Shape returned by /api/teams/[id]/leaderboard
interface RawTeamRow {
  userId: string;
  name?: string;
  username?: string;
  rating: number;
  wins: number;
  studySessions: number;
}

// Shape returned by /api/versus/leaderboard?type=global
interface RawGlobalRow {
  rank: number;
  userId: string;
  userName: string;
  rating: number;
  wins: number;
  totalChallenges: number;
}

function normalizeTeamRows(rows: RawTeamRow[]): LeaderboardEntry[] {
  return [...rows]
    .sort((a, b) => b.rating - a.rating)
    .map((r, idx) => ({
      rank: idx + 1,
      userId: r.userId,
      userName: r.username || r.name || 'Member',
      rating: r.rating,
      wins: r.wins,
      studySessions: r.studySessions,
    }));
}

function normalizeGlobalRows(rows: RawGlobalRow[]): LeaderboardEntry[] {
  return rows.map((r) => ({
    rank: r.rank,
    userId: typeof r.userId === 'string' ? r.userId : String(r.userId),
    userName: r.userName,
    rating: r.rating,
    wins: r.wins,
    totalChallenges: r.totalChallenges,
  }));
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
  emailInvitesUsed?: number;
}

const MAX_EMAIL_INVITES = 3;

type TabId = 'overview' | 'sets' | 'members' | 'leaderboard' | 'activity' | 'chat';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'sets', label: 'Sets', icon: BookOpen },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
];

interface ActivityFeedEntry {
  _id: string;
  type: 'study_session' | 'achievement_earned' | 'set_created' | 'set_shared' | 'challenge_completed' | 'team_joined' | 'follow';
  metadata: Record<string, unknown>;
  createdAt: string;
  userId: string;
  userName: string;
  profilePicture: string | null;
}

const ACTIVITY_ICON: Record<ActivityFeedEntry['type'], React.ElementType> = {
  study_session: BookOpen,
  achievement_earned: Award,
  set_created: Sparkles,
  set_shared: BookOpen,
  challenge_completed: Swords,
  team_joined: Users,
  follow: User,
};

function relativeTime(iso: string, now: number = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function activityCopy(e: ActivityFeedEntry): string {
  const m = e.metadata as Record<string, string | number | undefined>;
  switch (e.type) {
    case 'study_session':
      return 'completed a study session';
    case 'achievement_earned':
      return `earned the "${m.name ?? 'an'}" achievement`;
    case 'set_created':
      return `created the set "${m.title ?? 'a flashcard set'}"`;
    case 'set_shared':
      return `shared a flashcard set`;
    case 'challenge_completed':
      return `completed a Versus challenge`;
    case 'team_joined':
      return `joined the group`;
    case 'follow':
      return `followed someone`;
    default:
      return 'did something';
  }
}

const roleBadge: Record<string, { label: string; classes: string; icon: React.ElementType }> = {
  owner: { label: 'Owner', classes: 'bg-amber-100 text-amber-800', icon: Crown },
  admin: { label: 'Admin', classes: 'bg-blue-100 text-blue-800', icon: Shield },
  member: { label: 'Member', classes: 'bg-gray-100 text-gray-700', icon: User },
};

export default function TeamDashboardPage() {
  const params = useParams();
  const teamId = params.id as string;
  const { data: session, status } = useSession();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [team, setTeam] = useState<Team | null>(null);
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>('group');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

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
      setLeaderboardLoading(true);
      const url =
        leaderboardScope === 'group'
          ? `/api/teams/${teamId}/leaderboard?_t=${Date.now()}`
          : `/api/versus/leaderboard?type=global&limit=20&_t=${Date.now()}`;
      fetch(url)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          const rows = data.leaderboard || [];
          setLeaderboard(
            leaderboardScope === 'group'
              ? normalizeTeamRows(rows as RawTeamRow[])
              : normalizeGlobalRows(rows as RawGlobalRow[]),
          );
        })
        .catch(() => setLeaderboard([]))
        .finally(() => setLeaderboardLoading(false));
    }

    if (activeTab === 'activity') {
      setActivityLoading(true);
      fetch(`/api/teams/${teamId}/activity?_t=${Date.now()}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => setActivityFeed(data.feed || []))
        .catch(() => setActivityFeed([]))
        .finally(() => setActivityLoading(false));
    }
  }, [activeTab, team, teamId, leaderboardScope]);

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

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    setInviteFeedback(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteFeedback({ kind: 'error', message: data.error || 'Could not send invite.' });
        return;
      }
      setInviteFeedback({
        kind: 'success',
        message: `Invite sent. ${data.remainingInvites} email invite${data.remainingInvites === 1 ? '' : 's'} left for this group.`,
      });
      setInviteEmail('');
      await fetchTeam();
    } catch {
      setInviteFeedback({ kind: 'error', message: 'Network error. Please try again.' });
    } finally {
      setInviteSending(false);
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
          <p className="mt-3 text-gray-600">Loading study group...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600">{error || 'Study group not found.'}</p>
          <Link
            href="/team"
            className="mt-4 inline-flex items-center min-h-[44px] text-sm text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
            Back to Study Groups
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
            aria-label="Back to My Study Groups"
          >
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
            Back to Study Groups
          </Link>
          {isAdmin && (
            <Link
              href={`/team/${teamId}/settings`}
              className="inline-flex items-center min-h-[44px] text-sm text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Study group settings"
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

          {/* Email invite (admin only) */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Mail className="h-4 w-4 text-gray-500" aria-hidden="true" />
                  <span>Invite by email</span>
                </div>
                <span className="text-xs text-gray-500" aria-live="polite">
                  {Math.max(0, MAX_EMAIL_INVITES - (team.emailInvitesUsed ?? 0))} of {MAX_EMAIL_INVITES} left
                </span>
              </div>
              <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="invite-email" className="sr-only">Email address to invite</label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="flex-1 min-h-[44px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  disabled={inviteSending || (team.emailInvitesUsed ?? 0) >= MAX_EMAIL_INVITES}
                  aria-describedby="invite-help"
                />
                <button
                  type="submit"
                  disabled={inviteSending || !inviteEmail.trim() || (team.emailInvitesUsed ?? 0) >= MAX_EMAIL_INVITES}
                  className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {inviteSending ? 'Sending...' : 'Send invite'}
                </button>
              </form>
              <p id="invite-help" className="mt-2 text-xs text-gray-500">
                {(team.emailInvitesUsed ?? 0) >= MAX_EMAIL_INVITES
                  ? `You've used all ${MAX_EMAIL_INVITES} email invites for this group. Share the join code instead.`
                  : `Email invite includes the 6-digit join code. Recipients must be 13 or older and need a FlashLearnAI account to join.`}
              </p>
              {inviteFeedback && (
                <p
                  className={`mt-2 text-xs ${inviteFeedback.kind === 'success' ? 'text-green-700' : 'text-red-600'}`}
                  role={inviteFeedback.kind === 'error' ? 'alert' : 'status'}
                >
                  {inviteFeedback.message}
                </p>
              )}
            </div>
          )}
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
                  {/* Scope toggle */}
                  <div
                    role="tablist"
                    aria-label="Leaderboard scope"
                    className="inline-flex rounded-lg bg-gray-100 p-1 mb-4"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={leaderboardScope === 'group'}
                      onClick={() => setLeaderboardScope('group')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        leaderboardScope === 'group'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      This group
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={leaderboardScope === 'global'}
                      onClick={() => setLeaderboardScope('global')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        leaderboardScope === 'global'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Everyone
                    </button>
                  </div>

                  {leaderboardLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
                      <p className="mt-3 text-gray-500 text-sm">Loading leaderboard...</p>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                      <p className="text-sm text-gray-500">
                        {leaderboardScope === 'group'
                          ? 'No leaderboard data yet for this group.'
                          : 'No global leaderboard data yet.'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {leaderboardScope === 'group'
                          ? 'Members appear here once they have a Versus rating. Play a Versus challenge to get started.'
                          : 'Play Versus challenges to populate the global leaderboard.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table
                        className="w-full text-sm"
                        role="table"
                        aria-label={leaderboardScope === 'group' ? 'Group leaderboard' : 'Global leaderboard'}
                      >
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Rank
                            </th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Name
                            </th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Rating
                            </th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                              Wins
                            </th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                              {leaderboardScope === 'group' ? 'Sessions' : 'Challenges'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {leaderboard.map((entry) => {
                            const isMe = entry.userId === session?.user?.id;
                            return (
                              <tr
                                key={entry.userId}
                                className={isMe ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}
                              >
                                <td className="py-3 px-3 font-medium text-gray-900">
                                  {entry.rank <= 3 ? (
                                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                                      {entry.rank}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">#{entry.rank}</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-gray-900">
                                  {entry.userName}
                                  {isMe && (
                                    <span className="ml-2 text-xs font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                      You
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right font-semibold text-gray-900">
                                  {entry.rating}
                                </td>
                                <td className="py-3 px-3 text-right text-gray-600 hidden sm:table-cell">
                                  {entry.wins}
                                </td>
                                <td className="py-3 px-3 text-right text-gray-600 hidden sm:table-cell">
                                  {leaderboardScope === 'group'
                                    ? entry.studySessions ?? 0
                                    : entry.totalChallenges ?? 0}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Activity */}
            <div
              role="tabpanel"
              id="panel-activity"
              aria-labelledby="tab-activity"
              hidden={activeTab !== 'activity'}
            >
              {activeTab === 'activity' && (
                <>
                  {activityLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
                      <p className="mt-3 text-gray-500 text-sm">Loading activity...</p>
                    </div>
                  ) : activityFeed.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-10 w-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                      <p className="text-sm text-gray-500">No recent activity from this group yet.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Members appear here when they share sets, complete study sessions, or earn achievements.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100" role="list" aria-label="Recent activity">
                      {activityFeed.map((entry) => {
                        const Icon = ACTIVITY_ICON[entry.type] || Activity;
                        return (
                          <li key={entry._id} className="flex items-start gap-3 py-3">
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center">
                              <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium text-gray-900">{entry.userName}</span>{' '}
                                {activityCopy(entry)}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {relativeTime(entry.createdAt)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
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
