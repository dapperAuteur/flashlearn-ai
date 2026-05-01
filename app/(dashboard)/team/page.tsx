'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Users, Plus, LogIn, X } from 'lucide-react';
import TeamCard from '@/components/teams/TeamCard';

interface Team {
  _id: string;
  name: string;
  description?: string;
  memberCount: number;
  role: 'owner' | 'admin' | 'member';
  joinCode: string;
}

export default function TeamsPage() {
  const { status } = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchTeams = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/teams?_t=${Date.now()}`);
        if (!res.ok) throw new Error('Failed to load teams');
        const data = await res.json();
        setTeams(data.teams || []);
      } catch {
        setError('Failed to load teams. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, [status]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoinLoading(true);
    setJoinError(null);
    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.message || 'Failed to join team');
        return;
      }
      setShowJoinForm(false);
      setJoinCode('');
      // Refresh teams list
      const teamsRes = await fetch(`/api/teams?_t=${Date.now()}`);
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.teams || []);
      }
    } catch {
      setJoinError('An unexpected error occurred. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 -m-4 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="h-7 w-7 text-blue-600" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-gray-900">My Study Groups</h1>
          </div>
          <p className="text-sm text-gray-600">
            Create, join, and manage study groups. Share flashcard sets, study together, and invite up to 3 members per group by email.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link
            href="/team/create"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            aria-label="Create a new study group"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
            Create Study Group
          </Link>
          <button
            type="button"
            onClick={() => setShowJoinForm(!showJoinForm)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            aria-label="Join an existing study group with a code"
          >
            <LogIn className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
            Join with Code
          </button>
        </div>

        {/* Join Team Form */}
        {showJoinForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Join a Study Group</h2>
              <button
                type="button"
                onClick={() => {
                  setShowJoinForm(false);
                  setJoinError(null);
                  setJoinCode('');
                }}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close join form"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3">
              <label htmlFor="join-code" className="sr-only">
                Team join code
              </label>
              <input
                id="join-code"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter 6-digit join code"
                className="flex-1 min-h-[44px] px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-describedby={joinError ? 'join-error' : undefined}
                required
              />
              <button
                type="submit"
                disabled={joinLoading || !joinCode.trim()}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {joinLoading ? 'Joining...' : 'Join'}
              </button>
            </form>
            {joinError && (
              <p id="join-error" className="mt-2 text-sm text-red-600" role="alert">
                {joinError}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Study Groups Grid */}
        {teams.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-sm font-medium text-gray-900">No study groups yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first study group or joining one with a 6-digit code.
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            role="list"
            aria-label="Your study groups"
          >
            {teams.map((team) => (
              <TeamCard key={team._id} team={team} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
