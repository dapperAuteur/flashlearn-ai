/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useFlashcards } from '@/contexts/FlashcardContext';
import { PowerSyncFlashcardSet } from '@/lib/powersync/schema';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { SearchIcon, XIcon, DownloadIcon, UploadIcon } from 'lucide-react';
import SetEditModal from './SetEditModal';

import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useMigration } from '@/hooks/useMigration';
import { useSession } from 'next-auth/react';
import { LogContext, Logger } from '@/lib/logging/client-logger';
import { Skeleton } from '@/components/ui/skeleton';

interface FlashcardManagerProps {
  onStartStudy: (setId: string) => void;
  isLoading: boolean;
}

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface DueSet {
  setId: string;
  setName: string;
  dueCount: number;
}

type SortOption = 'recent' | 'alphabetical' | 'card-count' | 'due-first' | 'created';
type ViewMode = 'grid' | 'list';

export default function FlashcardManager({
  onStartStudy,
  isLoading
}: FlashcardManagerProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { flashcardSets, offlineSets: localSets, toggleOfflineAvailability, deleteFlashcardSet } = useFlashcards();
  const { migrating, error: migrationError, migrationProgress, migrateAllSets } = useMigration();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<PowerSyncFlashcardSet | null>(null);

  const { clearLocalCache } = useMigration();
  const { toast } = useToast();

  const [localError, setLocalError] = useState<string | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<string, { name: string; color: string }>>({});
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [dueSets, setDueSets] = useState<DueSet[]>([]);
  const [isDueSectionExpanded, setIsDueSectionExpanded] = useState(true);

  const isAdmin = session?.user?.role === 'Admin';

  // Fetch category info for user's sets
  useEffect(() => {
    if (flashcardSets.length === 0) return;
    const setIds = flashcardSets.map(s => s.id);
    fetch('/api/sets/categories/by-sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setIds }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.categories) setCategoryMap(data.categories);
      })
      .catch(() => { /* silent */ });
  }, [flashcardSets]);

  // Fetch categories
  useEffect(() => {
    fetch('/api/sets/categories')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.categories) setCategories(data.categories);
      })
      .catch(() => { /* silent */ });
  }, []);

  // Fetch due cards
  useEffect(() => {
    fetch(`/api/study/due-cards?_t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.sets) setDueSets(data.sets);
      })
      .catch(() => { /* silent */ });
  }, []);

  const handleStudyClick = (setId: string) => {
    onStartStudy(setId);
  };
  const handleEditSet = (set: PowerSyncFlashcardSet) => {
    setSelectedSet(set);
    setIsEditModalOpen(true);
  };

  const handleDeleteSet = async (setId: string) => {
    if (confirm('Are you sure you want to delete this set? This action cannot be undone.')) {
      try {
        Logger.log(LogContext.FLASHCARD, 'Attempting to delete set', { setId });
        await deleteFlashcardSet(setId);
        toast({
          title: 'Set Deleted',
          description: 'The flashcard set has been successfully deleted.',
        });
      } catch (error) {
        Logger.error(LogContext.FLASHCARD, 'Error deleting set', { error });
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not delete the set. Please try again.',
        });
      }
    }
  };
  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the local cache? This will force a full re-sync from the server.')) {
      await clearLocalCache();
    }
  }
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const handleToggle = async (setId: string) => {
  try {
    setLocalError(null);
    await toggleOfflineAvailability(setId);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to toggle offline');
    }
  };

  // Build due count map for sorting
  const dueCountMap = new Map(dueSets.map(s => [s.setId, s.dueCount]));

  // Filter by search and category
  let filtered = flashcardSets.filter(set =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedCategory) {
    filtered = filtered.filter(set => {
      const cat = categoryMap[set.id];
      return cat && cat.name === categories.find(c => c.id === selectedCategory)?.name;
    });
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'alphabetical':
        return a.title.localeCompare(b.title);
      case 'card-count':
        return (b.card_count || 0) - (a.card_count || 0);
      case 'due-first':
        return (dueCountMap.get(b.id) || 0) - (dueCountMap.get(a.id) || 0);
      case 'created':
        return 0; // Natural order from DB is newest first
      case 'recent':
      default:
        return 0; // Default order
    }
  });

  // Categories that the user's sets actually have
  const userCategoryIds = new Set<string>();
  for (const set of flashcardSets) {
    const cat = categoryMap[set.id];
    if (cat) {
      const match = categories.find(c => c.name === cat.name);
      if (match) userCategoryIds.add(match.id);
    }
  }
  const relevantCategories = categories.filter(c => userCategoryIds.has(c.id));

  const isOffline = (setId: string) => localSets.some(s => s.set_id === setId);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'recent', label: 'Recently Studied' },
    { value: 'alphabetical', label: 'Alphabetical' },
    { value: 'card-count', label: 'Most Cards' },
    { value: 'due-first', label: 'Most Due' },
    { value: 'created', label: 'Date Created' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-600">
          {localSets.length} of 10 sets available offline
        </p>
      </div>

      {/* Due for Review Section */}
      {dueSets.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setIsDueSectionExpanded(!isDueSectionExpanded)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-amber-900 text-sm sm:text-base">
                {dueSets.reduce((sum, s) => sum + s.dueCount, 0)} cards due for review
              </span>
              <span className="text-xs text-amber-700">
                across {dueSets.length} set{dueSets.length !== 1 ? 's' : ''}
              </span>
            </div>
            {isDueSectionExpanded ? (
              <ChevronUpIcon className="h-4 w-4 text-amber-600" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-amber-600" />
            )}
          </button>
          {isDueSectionExpanded && (
            <div className="px-4 pb-3 space-y-2">
              {dueSets.map(ds => (
                <div
                  key={ds.setId}
                  className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm text-gray-800 truncate">{ds.setName}</span>
                    <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {ds.dueCount} due
                    </span>
                  </div>
                  <button
                    onClick={() => handleStudyClick(ds.setId)}
                    className="flex-shrink-0 ml-2 px-3 py-1 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Study
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search, Sort, and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search sets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:border-blue-500 text-gray-900"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-500"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-400 hover:text-gray-600'}`}
              title="Grid view"
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-400 hover:text-gray-600'}`}
              title="List view"
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      {relevantCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !selectedCategory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {relevantCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
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

      {/* Action buttons */}
      <div className="flex gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={() => setIsImportModalOpen(true)} className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
            <UploadIcon className="w-4 h-4 mr-2" />
            Import
          </button>
          <button onClick={() => router.push('/generate')} className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
            <PlusIcon className="w-4 h-4 mr-2" />
            New Set
          </button>
        </div>

      <Link href="/generate" className="inline-flex items-end px-4 py-2 bg-blue-600 text-white rounded-md">
        <PlusIcon className="h-4 w-4 mr-2" />
        Create Set
      </Link>
      </div>
      {/* Error display for local component errors */}
        {localError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{localError}</p>
          </div>
        )}
        {migrationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Migration Error</p>
            <p className="text-red-800">{migrationError}</p>
          </div>
        )}
        {/* Migration progress */}
      {migrating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">Migration in Progress</p>
          <div className="mt-2 bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${migrationProgress.total > 0
                  ? (migrationProgress.completed / migrationProgress.total) * 100
                  : 0}%`
              }}
            />
          </div>
          <p className="text-blue-700 text-sm mt-2">
            Processing batch {migrationProgress.currentBatch} sets...
          </p>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map(set => (
            <div key={set.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{set.title}</h3>
                  {set.description && <p className="text-sm text-gray-500 mt-1">{set.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <p className="text-sm text-gray-500">{set.card_count} cards</p>
                    {categoryMap[set.id] && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${categoryMap[set.id].color}20`,
                          color: categoryMap[set.id].color,
                        }}
                      >
                        {categoryMap[set.id].name}
                      </span>
                    )}
                    {dueCountMap.get(set.id) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <ClockIcon className="h-3 w-3 mr-0.5" />
                        {dueCountMap.get(set.id)} due
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(set.id)}
                  className={`p-2 rounded-full ${
                    isOffline(set.id)
                      ? 'text-green-600 bg-green-100'
                      : 'text-gray-400 bg-gray-100'
                  }`}
                  title={isOffline(set.id) ? 'Remove from offline' : 'Add to offline'}
                >
                  {isOffline(set.id) ? (
                    <CloudArrowDownIcon className="h-5 w-5" />
                  ) : (
                    <CloudArrowUpIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleStudyClick(set.id)}
                  className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Study
                </button>
                <button
                  onClick={() => handleEditSet(set)}
                  className="px-3 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                  title="Edit set"
                >
                  <PencilSquareIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
          {sorted.map(set => (
            <div key={set.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{set.title}</h3>
                  {categoryMap[set.id] && (
                    <span
                      className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${categoryMap[set.id].color}20`,
                        color: categoryMap[set.id].color,
                      }}
                    >
                      {categoryMap[set.id].name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500">{set.card_count} cards</span>
                  {dueCountMap.get(set.id) && (
                    <span className="inline-flex items-center text-xs text-amber-700">
                      <ClockIcon className="h-3 w-3 mr-0.5" />
                      {dueCountMap.get(set.id)} due
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(set.id)}
                  className={`p-1.5 rounded-full ${
                    isOffline(set.id)
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                  title={isOffline(set.id) ? 'Remove from offline' : 'Add to offline'}
                >
                  {isOffline(set.id) ? (
                    <CloudArrowDownIcon className="h-4 w-4" />
                  ) : (
                    <CloudArrowUpIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleEditSet(set)}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                  title="Edit set"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleStudyClick(set.id)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
                >
                  Study
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="text-center py-12">
          {selectedCategory ? (
            <>
              <p className="text-gray-500">
                No {categories.find(c => c.id === selectedCategory)?.name || ''} sets yet.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  onClick={() => setSelectedCategory('')}
                  className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Show All Sets
                </button>
                <Link
                  href="/explore"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Explore Public Sets
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-500">No flashcard sets found</p>
              <Link
                href="/generate"
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Set
              </Link>
            </>
          )}
        </div>
      )}
      {selectedSet && (
        <SetEditModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setSelectedSet(null); }}
          set={{
            _id: selectedSet.id,
            title: selectedSet.title,
            description: selectedSet.description || undefined,
            isPublic: selectedSet.is_public === 1,
            cardCount: selectedSet.card_count,
          }}
          isAdmin={isAdmin}
          onSave={() => {
            setIsEditModalOpen(false);
            setSelectedSet(null);
          }}
        />
      )}
    </div>
  );
}
