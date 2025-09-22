/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  CloudArrowDownIcon, 
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  TagIcon,
  FolderIcon,
  WifiIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline';
import { 
  getOfflineSets, 
  saveOfflineSet, 
  removeOfflineSet,
  getCategories,
  Category,
  OfflineFlashcardSet 
} from '@/lib/db/indexeddb';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import CsvImportModal from './CsvImportModal';
import CategoryManager from './CategoryManager';
import SetEditModal from './SetEditModal';

interface FlashcardSet {
  _id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  cardCount: number;
  categories?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function FlashcardManager() {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [offlineSets, setOfflineSets] = useState<OfflineFlashcardSet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingSet, setEditingSet] = useState<FlashcardSet | null>(null);
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load online sets if connected
      console.log('Loading data, isOnline:', isOnline); // Debug log
      if (isOnline) {
        const response = await fetch('/api/lists');
        console.log('API response:', response.status); // Debug log
        if (response.ok) {
          const onlineSets = await response.json();
          console.log('Online sets:', onlineSets); // Debug log
          setSets(onlineSets);
        }
      }
      
      // Always load offline data
      const [offlineData, categoryData] = await Promise.all([
        getOfflineSets(),
        getCategories()
      ]);
      console.log('Offline data:', offlineData); // Debug
      setOfflineSets(offlineData);
      setCategories(categoryData);
      
    } catch (error) {
      Logger.error(LogContext.FLASHCARD, 'Error loading flashcard data', { error });
      console.error('Load data error:', error); // Debug log
    } finally {
      setLoading(false);
    }
  };

  const toggleOffline = async (set: FlashcardSet) => {
    const isCurrentlyOffline = offlineSets.some(s => s.setId === set._id);
    
    if (isCurrentlyOffline) {
      // Remove from offline
      await removeOfflineSet(set._id);
      setOfflineSets(prev => prev.filter(s => s.setId !== set._id));
      Logger.log(LogContext.FLASHCARD, 'Set removed from offline', { setId: set._id });
    } else {
      // Add to offline
      if (!isOnline) {
        alert('Cannot download sets while offline');
        return;
      }
      
      try {
        // Fetch full set data
        const response = await fetch(`/api/sets/${set._id}`);
        if (!response.ok) throw new Error('Failed to fetch set details');
        
        const fullSet = await response.json();
        
        const offlineSet: OfflineFlashcardSet = {
          setId: set._id,
          title: set.title,
          description: set.description,
          isPublic: set.isPublic,
          categories: set.categories || [],
          tags: set.tags || [],
          flashcards: fullSet.flashcards || [],
          lastSynced: new Date(),
          isOfflineEnabled: true,
          cardCount: set.cardCount
        };
        
        await saveOfflineSet(offlineSet);
        setOfflineSets(prev => [...prev, offlineSet]);
        Logger.log(LogContext.FLASHCARD, 'Set added to offline', { setId: set._id });
        
      } catch (error) {
        Logger.error(LogContext.FLASHCARD, 'Failed to add set to offline', { error });
        alert('Failed to download set for offline use');
      }
    }
  };

  const downloadTemplate = () => {
    Logger.log(LogContext.FLASHCARD, 'Downloading CSV template');
    const templateContent = `"front","back"\n"Example Question","Example Answer"\n"What is 2+2?","4"`;
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "flashcard_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const combinedSets = useMemo(() => {
  const combined = [];
  const processedIds = new Set();

  // Add offline sets first
  offlineSets.forEach(set => {
    combined.push({
      _id: set.setId,
      title: set.title,
      description: set.description,
      isPublic: set.isPublic,
      cardCount: set.cardCount,
      categories: set.categories || [],
      tags: set.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOfflineAvailable: true
    });
    processedIds.add(set.setId);
  });

  // Add online sets not already processed
  sets.forEach(set => {
    if (!processedIds.has(set._id)) {
      combined.push({
        ...set,
        isOfflineAvailable: false
      });
    }
  });

  return combined;
}, [sets, offlineSets]);

  // Filter and search logic
  const filteredSets = combinedSets.filter(set => {
    const matchesSearch = set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         set.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           (set.categories && set.categories.includes(selectedCategory));
    const matchesTag = selectedTag === 'all' || 
                      (set.tags && set.tags.includes(selectedTag));
    
    return matchesSearch && matchesCategory && matchesTag;
  });

  // Get unique tags from all sets
  const allTags = Array.from(new Set(sets.flatMap(set => set.tags || [])));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <WifiIcon className="h-5 w-5 text-green-500" />
              ) : (
                <SignalSlashIcon className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {offlineSets.length} sets available offline
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-1" />
              Import CSV
            </button>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <CloudArrowDownIcon className="h-4 w-4 mr-1" />
              Download Template
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4 text-gray-600">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search flashcard sets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <FolderIcon className="h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Tag Filter */}
          <div className="flex items-center space-x-2">
            <TagIcon className="h-5 w-5 text-gray-400" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setShowCategoryModal(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Manage Categories
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Link
          href="/generate"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Flashcard Set
        </Link>
      </div>

      {/* Sets Grid */}
      {filteredSets.length === 0 ? (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-16 sm:px-6 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || selectedCategory !== 'all' || selectedTag !== 'all' 
                ? 'No flashcards match your filters' 
                : 'No flashcards'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedCategory !== 'all' || selectedTag !== 'all'
                ? 'Try adjusting your search terms or filters.'
                : 'Get started by creating a new flashcard set.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSets.map((set) => {
            const isOffline = offlineSets.some(s => s.setId === set._id);
            
            return (
              <div key={set._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {set.title}
                      </h3>
                      {set.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {set.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleOffline(set)}
                      className={`ml-2 p-2 rounded-full ${
                        isOffline 
                          ? 'text-green-600 bg-green-100 hover:bg-green-200' 
                          : 'text-gray-400 bg-gray-100 hover:bg-gray-200'
                      }`}
                      title={isOffline ? 'Available offline' : 'Download for offline use'}
                    >
                      {isOffline ? (
                        <CloudArrowDownIcon className="h-5 w-5" />
                      ) : (
                        <CloudArrowUpIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{set.cardCount} cards</span>
                      <span>{set.isPublic ? 'Public' : 'Private'}</span>
                    </div>
                    
                    {(set.categories || set.tags) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {set.categories?.map(category => (
                          <span
                            key={category}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {category}
                          </span>
                        ))}
                        {set.tags?.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex space-x-2">
                    <Link
                      href={`/study/${set._id}`}
                      className="flex-1 text-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Study
                    </Link>
                    <button
                      onClick={() => setEditingSet(set)}
                      className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CsvImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={loadData}
      />
      
      <CategoryManager
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        onCategoriesChange={setCategories}
      />
      
      {editingSet && (
        <SetEditModal
          isOpen={true}
          onClose={() => setEditingSet(null)}
          set={editingSet}
          onSave={loadData}
        />
      )}
    </div>
  );
}