'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clientApi } from '@/lib/api';

export default function GeneratePage() {
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ flashcards: { front: string; back: string }[]; setId: string; cardCount: number } | null>(null);
  const [error, setError] = useState('');

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await clientApi<{ flashcards: { front: string; back: string }[]; setId: string; cardCount: number }>(
        'POST', '/generate', { topic: topic.trim(), title: title.trim() || undefined }
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Generate Flashcards</h1>

      <form onSubmit={generate} className="max-w-xl space-y-4 mb-8">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
          <input id="topic" type="text" value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="e.g., Photosynthesis in plants" required
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
          <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Custom title for the set"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={loading || !topic.trim()}
          className="px-6 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4" role="alert">{error}</p>}

      {result && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{result.cardCount} cards generated</h2>
            <Link href={`/sets/${result.setId}`} className="text-sm text-blue-600 hover:underline">View set</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.flashcards.map((card, i) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Front</p>
                <p className="text-sm font-medium text-gray-900 mb-3">{card.front}</p>
                <p className="text-xs text-gray-400 mb-1">Back</p>
                <p className="text-sm text-gray-700">{card.back}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
