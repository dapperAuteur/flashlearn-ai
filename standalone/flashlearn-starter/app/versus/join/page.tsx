'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api';

export default function JoinChallengePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await clientApi<{ challengeId: string }>('POST', '/versus/join', { challengeCode: code.trim() });
      router.push(`/versus/play/${data.challengeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-sm mx-auto py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Join a Challenge</h1>
      <p className="text-sm text-gray-500 mb-8 text-center">Enter the 6-character code your friend shared with you.</p>

      <form onSubmit={join} className="space-y-4">
        <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g., X7K2M9" maxLength={6} required autoFocus
          className="w-full text-center text-3xl font-mono font-bold tracking-widest border-2 rounded-xl px-4 py-4 uppercase"
          aria-label="Challenge code" />
        {error && <p className="text-red-600 text-sm text-center" role="alert">{error}</p>}
        <button type="submit" disabled={loading || code.length < 4}
          className="w-full px-6 py-3 text-sm font-medium text-white rounded-xl disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}>
          {loading ? 'Joining...' : 'Join Challenge'}
        </button>
      </form>
    </div>
  );
}
