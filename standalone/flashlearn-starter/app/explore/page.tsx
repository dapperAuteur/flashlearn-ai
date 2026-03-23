'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { clientApi } from '@/lib/api';

interface PublicSet {
  id: string;
  title: string;
  description?: string;
  cardCount: number;
  source: string;
  rating: number;
  usageCount: number;
}

export default function ExplorePage() {
  const [sets, setSets] = useState<PublicSet[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('popular');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ sort, limit: '30' });
        if (search) params.set('search', search);
        const data = await clientApi<{ sets: PublicSet[] }>('GET', `/sets/explore?${params}`);
        setSets(data.sets);
      } catch { setSets([]); }
      setLoading(false);
    };
    const timer = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [search, sort]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Explore Public Sets</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search topics..." aria-label="Search flashcard sets"
          className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort order"
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="popular">Most Popular</option>
          <option value="recent">Most Recent</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading...</p>
      ) : sets.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No sets found. Try a different search.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map(set => (
            <Link key={set.id} href={`/sets/${set.id}`}
              className="block bg-white border rounded-lg p-5 hover:shadow-md transition-shadow">
              <h2 className="font-semibold text-gray-900 mb-1 truncate">{set.title}</h2>
              <p className="text-xs text-gray-500">{set.cardCount} cards &middot; {set.usageCount} uses</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
