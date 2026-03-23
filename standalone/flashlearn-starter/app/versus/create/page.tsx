'use client';

import { useState, useEffect } from 'react';
import { clientApi } from '@/lib/api';

interface SetOption { id: string; title: string; cardCount: number }

export default function CreateChallengePage() {
  const [sets, setSets] = useState<SetOption[]>([]);
  const [setId, setSetId] = useState('');
  const [scope, setScope] = useState('public');
  const [mode, setMode] = useState('classic');
  const [result, setResult] = useState<{ challengeCode: string; challengeId: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clientApi<{ sets: SetOption[] }>('GET', '/sets?limit=50')
      .then(data => setSets(data.sets))
      .catch(() => {});
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setId) return;
    setLoading(true);
    try {
      const data = await clientApi<{ challengeCode: string; challengeId: string }>(
        'POST', '/versus/challenges', { flashcardSetId: setId, scope, studyMode: mode }
      );
      setResult(data);
    } catch { /* empty */ }
    setLoading(false);
  };

  if (result) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Challenge Created!</h1>
        <p className="text-gray-600 mb-6">Share this code with your friends:</p>
        <div className="text-5xl font-mono font-bold tracking-widest mb-6" style={{ color: 'var(--color-primary)' }}>
          {result.challengeCode}
        </div>
        <p className="text-sm text-gray-500">They can join at the Join page with this code.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create a Challenge</h1>
      <form onSubmit={create} className="max-w-md space-y-4">
        <div>
          <label htmlFor="setId" className="block text-sm font-medium text-gray-700 mb-1">Flashcard Set</label>
          <select id="setId" value={setId} onChange={e => setSetId(e.target.value)} required
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Select a set...</option>
            {sets.map(s => <option key={s.id} value={s.id}>{s.title} ({s.cardCount} cards)</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="scope" className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
          <select id="scope" value={scope} onChange={e => setScope(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="direct">Direct (1v1)</option>
            <option value="classroom">Classroom (up to 30)</option>
            <option value="public">Public (up to 50)</option>
          </select>
        </div>
        <div>
          <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-1">Study Mode</label>
          <select id="mode" value={mode} onChange={e => setMode(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="classic">Classic</option>
            <option value="multiple-choice">Multiple Choice</option>
          </select>
        </div>
        <button type="submit" disabled={loading || !setId}
          className="w-full px-6 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}>
          {loading ? 'Creating...' : 'Create Challenge'}
        </button>
      </form>
    </div>
  );
}
