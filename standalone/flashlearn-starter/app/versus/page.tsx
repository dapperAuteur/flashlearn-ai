'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { clientApi } from '@/lib/api';

interface Challenge {
  id: string;
  challengeCode: string;
  setName: string;
  studyMode: string;
  scope: string;
  status: string;
  cardCount: number;
  participantCount: number;
  expiresAt: string;
}

export default function VersusPage() {
  const [myChallenges, setMyChallenges] = useState<Challenge[]>([]);
  const [openChallenges, setOpenChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [myData, openData] = await Promise.all([
          clientApi<{ challenges: Challenge[] }>('GET', '/versus/challenges?limit=10'),
          clientApi<{ challenges: Challenge[] }>('GET', '/versus/open?limit=10'),
        ]);
        setMyChallenges(myData.challenges);
        setOpenChallenges(openData.challenges);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p className="text-gray-500 text-center py-12">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Versus Mode</h1>
        <div className="flex gap-2">
          <Link href="/versus/join" className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Join
          </Link>
          <Link href="/versus/create" className="px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: 'var(--color-primary)' }}>
            Create Challenge
          </Link>
        </div>
      </div>

      {/* My Challenges */}
      <section aria-labelledby="my-challenges" className="mb-8">
        <h2 id="my-challenges" className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">My Challenges</h2>
        {myChallenges.length === 0 ? (
          <p className="text-gray-400 text-sm">No challenges yet.</p>
        ) : (
          <div className="space-y-2">
            {myChallenges.map(c => (
              <Link key={c.id} href={`/versus/results/${c.id}`}
                className="block bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{c.setName}</p>
                    <p className="text-xs text-gray-500">Code: {c.challengeCode} &middot; {c.participantCount} players &middot; {c.status}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Open Challenges */}
      <section aria-labelledby="open-challenges">
        <h2 id="open-challenges" className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Open Challenges</h2>
        {openChallenges.length === 0 ? (
          <p className="text-gray-400 text-sm">No open challenges right now.</p>
        ) : (
          <div className="space-y-2">
            {openChallenges.map(c => (
              <Link key={c.id} href={`/versus/join?code=${c.challengeCode}`}
                className="block bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{c.setName}</p>
                    <p className="text-xs text-gray-500">{c.cardCount} cards &middot; {c.participantCount} players</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Join</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 text-center">
        <Link href="/versus/stats" className="text-sm text-blue-600 hover:underline">View my stats</Link>
      </div>
    </div>
  );
}
