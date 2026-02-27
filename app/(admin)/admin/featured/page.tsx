'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Star,
  Search,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
} from 'lucide-react';

interface FeaturedSet {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  source: string;
  featuredOrder: number;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  source: string;
}

export default function AdminFeaturedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [featured, setFeatured] = useState<FeaturedSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const user = session?.user as { role?: string } | undefined;

  const fetchFeatured = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/featured-sets');
      if (res.ok) {
        const data = await res.json();
        setFeatured(data.featured);
      }
    } catch {
      setError('Failed to load featured sets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'Admin') {
      fetchFeatured();
    } else if (status === 'authenticated') {
      router.push('/flashcards');
    }
  }, [status, user?.role, router, fetchFeatured]);

  const searchSets = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/sets/public?search=${encodeURIComponent(searchTerm)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        // Filter out already featured sets
        const featuredIds = new Set(featured.map((f) => f.id));
        setSearchResults(data.sets.filter((s: SearchResult) => !featuredIds.has(s.id)));
      }
    } catch {
      setError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const featureSet = async (setId: string) => {
    try {
      const res = await fetch('/api/admin/featured-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId }),
      });
      if (res.ok) {
        setSearchResults((prev) => prev.filter((s) => s.id !== setId));
        fetchFeatured();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to feature set');
      }
    } catch {
      setError('Failed to feature set');
    }
  };

  const unfeatureSet = async (setId: string) => {
    try {
      const res = await fetch(`/api/admin/featured-sets/${setId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFeatured();
      }
    } catch {
      setError('Failed to unfeature set');
    }
  };

  const moveSet = async (setId: string, direction: 'up' | 'down') => {
    const idx = featured.findIndex((f) => f.id === setId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= featured.length) return;

    // Swap order values
    try {
      await Promise.all([
        fetch(`/api/admin/featured-sets/${featured[idx].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featuredOrder: featured[swapIdx].featuredOrder }),
        }),
        fetch(`/api/admin/featured-sets/${featured[swapIdx].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ featuredOrder: featured[idx].featuredOrder }),
        }),
      ]);
      fetchFeatured();
    } catch {
      setError('Failed to reorder');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Featured Sets</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pin high-quality public sets to appear prominently on the Explore page
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Currently Featured */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Currently Featured ({featured.length})
        </h2>

        {featured.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            No featured sets yet. Search below to add some.
          </p>
        ) : (
          <div className="space-y-2">
            {featured.map((set, idx) => (
              <div
                key={set.id}
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg"
              >
                <span className="text-xs font-medium text-gray-400 w-6 text-center">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{set.title}</p>
                  <p className="text-xs text-gray-500">
                    {set.cardCount} cards &middot; {set.source}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveSet(set.id, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveSet(set.id, 'down')}
                    disabled={idx === featured.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => unfeatureSet(set.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search to add */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Find Sets to Feature</h2>
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchSets()}
              placeholder="Search public sets..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={searchSets}
            disabled={searching || !searchTerm.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((set) => (
              <div
                key={set.id}
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{set.title}</p>
                  <p className="text-xs text-gray-500">
                    {set.cardCount} cards &middot; {set.source}
                  </p>
                </div>
                <button
                  onClick={() => featureSet(set.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-lg hover:bg-yellow-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Feature
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
