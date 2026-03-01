'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  BookOpenIcon,
  PlayIcon,
  StarIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import ReportModal from '@/components/ui/ReportModal';

interface CategoryInfo {
  _id?: string;
  name: string;
  slug: string;
  color: string;
}

interface PublicSet {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  source: string;
  categories?: CategoryInfo[];
  tags?: string[];
  createdAt: string;
}

interface ExploreCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export default function ExplorePage() {
  const { data: session } = useSession();
  const [sets, setSets] = useState<PublicSet[]>([]);
  const [featured, setFeatured] = useState<PublicSet[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [categories, setCategories] = useState<ExploreCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [reportingSet, setReportingSet] = useState<PublicSet | null>(null);
  const limit = 20;

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/sets/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  const fetchSets = useCallback(async (search: string, currentOffset: number, category: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(currentOffset),
      });
      if (search) params.set('search', search);
      if (category) params.set('category', category);

      const res = await fetch(`/api/sets/public?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (currentOffset === 0) {
          setSets(data.sets);
          setFeatured(data.featured || []);
        } else {
          setSets(prev => [...prev, ...data.sets]);
        }
        setTotal(data.total);
        setHasMore(data.hasMore);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchSets(searchTerm, 0, selectedCategory);
  }, [searchTerm, selectedCategory, fetchSets]);

  const loadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchSets(searchTerm, newOffset, selectedCategory);
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? '' : categoryId);
  };

  return (
    <div className="px-4 py-12 sm:py-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Explore Flashcard Sets
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Browse community flashcard sets and start studying — no account required.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-lg mx-auto mb-6">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search public sets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 py-3 w-full border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label="Clear search"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Category filter pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{
                  backgroundColor: selectedCategory === cat.id ? cat.color : `${cat.color}20`,
                  color: selectedCategory === cat.id ? 'white' : cat.color,
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Featured section */}
        {featured.length > 0 && !searchTerm && !selectedCategory && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <StarIcon className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900">Featured Sets</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((set) => (
                <div
                  key={set.id}
                  className="bg-white rounded-xl border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col relative"
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                      <StarIcon className="h-3 w-3" />
                      Featured
                    </span>
                    {session && (
                      <button
                        onClick={(e) => { e.preventDefault(); setReportingSet(set); }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Report this set"
                      >
                        <FlagIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 truncate pr-16">{set.title}</h3>
                  {set.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{set.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 mt-auto">
                    <span>{set.cardCount} cards</span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">{set.source}</span>
                    {set.categories?.map(cat => (
                      <span
                        key={cat.name}
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${cat.color}20`,
                          color: cat.color,
                        }}
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/study?setId=${set.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Study Now
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-gray-600 mb-4">
            {total} {total === 1 ? 'set' : 'sets'} found
            {searchTerm && ` for "${searchTerm}"`}
          </p>
        )}

        {/* Loading state */}
        {isLoading && sets.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && sets.length === 0 && (
          <div className="text-center py-16">
            <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? `No sets matching "${searchTerm}"` : 'No public sets available yet'}
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try a different search term' : 'Check back soon!'}
            </p>
            {(searchTerm || selectedCategory) && (
              <button
                onClick={() => { setSearchTerm(''); setSelectedCategory(''); }}
                className="mt-4 inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Sets grid */}
        {sets.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sets.map((set) => (
                <div
                  key={set.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col relative"
                >
                  {session && (
                    <button
                      onClick={(e) => { e.preventDefault(); setReportingSet(set); }}
                      className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Report this set"
                    >
                      <FlagIcon className="h-4 w-4" />
                    </button>
                  )}
                  <h3 className="font-semibold text-gray-900 mb-1 truncate pr-8">{set.title}</h3>
                  {set.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{set.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mb-4 mt-auto">
                    <span>{set.cardCount} cards</span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">{set.source}</span>
                    {set.categories?.map(cat => (
                      <span
                        key={cat.name}
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${cat.color}20`,
                          color: cat.color,
                        }}
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/study?setId=${set.id}`}
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Study Now
                  </Link>
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-6 py-2.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Report Modal */}
      {reportingSet && (
        <ReportModal
          isOpen={!!reportingSet}
          onClose={() => setReportingSet(null)}
          setId={reportingSet.id}
          setTitle={reportingSet.title}
        />
      )}
    </div>
  );
}
