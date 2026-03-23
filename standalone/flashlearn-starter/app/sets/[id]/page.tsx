import Link from 'next/link';
import { api } from '@/lib/api';

interface SetDetail {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  source: string;
  isPublic: boolean;
  flashcards: { id: string; front: string; back: string }[];
  createdAt: string;
}

export default async function SetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let set: SetDetail | null = null;
  let error = '';

  try {
    set = await api<SetDetail>('GET', `/sets/${id}`);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load set';
  }

  if (error || !set) {
    return <p className="text-red-600" role="alert">{error || 'Set not found'}</p>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{set.title}</h1>
          <p className="text-sm text-gray-500">{set.cardCount} cards &middot; {set.source}</p>
        </div>
        <Link href={`/study?setId=${set.id}`}
          className="inline-flex px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: 'var(--color-primary)' }}>
          Study This Set
        </Link>
      </div>

      {set.description && <p className="text-gray-600 mb-6">{set.description}</p>}

      <div className="space-y-3">
        {set.flashcards.map((card, i) => (
          <div key={card.id} className="bg-white border rounded-lg p-4 flex gap-4">
            <span className="text-xs text-gray-400 font-mono mt-1">{i + 1}</span>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Front</p>
                <p className="text-sm text-gray-900">{card.front}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Back</p>
                <p className="text-sm text-gray-700">{card.back}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
