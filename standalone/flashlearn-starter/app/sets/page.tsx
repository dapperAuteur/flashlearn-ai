import Link from 'next/link';
import { api } from '@/lib/api';

interface FlashcardSet {
  id: string;
  title: string;
  description?: string;
  cardCount: number;
  source: string;
  createdAt: string;
}

export default async function SetsPage() {
  let sets: FlashcardSet[] = [];
  let error = '';

  try {
    const data = await api<{ sets: FlashcardSet[] }>('GET', '/sets?limit=50');
    sets = data.sets;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load sets';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Sets</h1>
        <Link href="/generate" className="px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: 'var(--color-primary)' }}>
          Generate New
        </Link>
      </div>

      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

      {sets.length === 0 && !error && (
        <p className="text-gray-500 text-center py-12">No flashcard sets yet. Generate some!</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sets.map(set => (
          <Link key={set.id} href={`/sets/${set.id}`}
            className="block bg-white border rounded-lg p-5 hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-gray-900 mb-1 truncate">{set.title}</h2>
            <p className="text-xs text-gray-500 mb-2">{set.cardCount} cards &middot; {set.source}</p>
            {set.description && <p className="text-sm text-gray-600 line-clamp-2">{set.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
