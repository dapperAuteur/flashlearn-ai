/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { List } from '@/models/List';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import CsvImportModal from '../flashcards/CsvImportModal';
import { useStudySession } from '@/contexts/StudySessionContext';
import SignUpModal from '@/components/ui/SignUpModal';
import clsx from 'clsx';
import { 
  BookOpenIcon, 
  PlayIcon, 
  CloudArrowUpIcon,
  SparklesIcon,
  ArrowRightIcon,
  LockClosedIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  TagIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useFlashcards } from '@/contexts/FlashcardContext';
import { PowerSyncFlashcardSet } from '@/lib/powersync/schema';


export default function StudySessionSetup() {
  const { startSession, isLoading, studyDirection, setStudyDirection } = useStudySession();
  const { flashcardSets } = useFlashcards(); // Get PowerSync sets
  const { status } = useSession();

  const [lists, setLists] = useState<List[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<'select' | 'direction' | 'ready'>('select');
  
  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const fetchLists = async () => {
    try {
      // Only fetch from API if authenticated
      if (status === 'authenticated') {
        const response = await fetch('/api/lists');
        if (!response.ok) throw new Error('Failed to fetch lists');
        const apiLists = await response.json();
        
        // Merge with PowerSync sets (PowerSync sets take priority)
        const powerSyncSetIds = new Set(flashcardSets.map(s => s.id));
        const uniqueApiLists = apiLists.filter((list: List) => 
          !powerSyncSetIds.has(list._id?.toString() || '')
        );
        
        setLists([...flashcardSets.map(convertPowerSyncToList), ...uniqueApiLists]);
      } else {
        // Unauthenticated: only show PowerSync sets (public sets)
        setLists(flashcardSets.map(convertPowerSyncToList));
      }
    } catch (error) {
      setError('Failed to load lists. Showing offline sets only.');
      Logger.error(LogContext.STUDY, 'Error fetching lists', { error });
      
      // Fallback to PowerSync sets only
      setLists(flashcardSets.map(convertPowerSyncToList));
    }
  };

  // Helper: Convert PowerSync set to List format
  const convertPowerSyncToList = (set: PowerSyncFlashcardSet): List => ({
    _id: set.id,
    title: set.title,
    description: set.description || undefined,
    isPublic: set.is_public === 1,
    userId: set.user_id,
    cardCount: set.card_count,
    createdAt: new Date(set.created_at),
    updatedAt: new Date(set.updated_at),
    tags: []
  });

  useEffect(() => {
    fetchLists();
  }, [flashcardSets, status]); // Re-fetch when PowerSync sets change

  useEffect(() => {
    if (selectedListId && currentStep === 'select') {
      setCurrentStep('direction');
    }
  }, [selectedListId, currentStep]);

  const handleStartSession = async () => {
    if (!selectedListId) {
      setError('Please select a list to study');
      return;
    }
    setError(null);
    await startSession(selectedListId, studyDirection);
  };

  const handleDirectionChange = (direction: 'front-to-back' | 'back-to-front') => {
    if (status !== 'authenticated' && direction === 'back-to-front') {
      setShowSignUpModal(true);
      Logger.log(LogContext.STUDY, "Unauthenticated user clicked premium feature upsell.");
    } else {
      setStudyDirection(direction);
      setCurrentStep('ready');
    }
  };

  const handleImportSuccess = () => {
    fetchLists();
  };

  const selectedList = lists.find(list => list._id?.toString() === selectedListId);

  // Filter and search logic
  const filteredLists = useMemo(() => {
    return lists.filter(list => {
      const matchesSearch = list.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           list.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Note: Simplified filtering - categories/tags may not be available on List type
      // This focuses on search functionality which is the main requirement
      return matchesSearch;
    });
  }, [lists, searchTerm]);

  // Simplified - remove category/tag filtering since List type doesn't support it
  const allCategories: string[] = [];
  const allTags: string[] = [];

  return (
    <>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <SparklesIcon className="h-4 w-4" />
            <span>Start Your Study Session</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Learning Path
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select a flashcard set and customize your study experience for optimal learning.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep === 'select' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'select' ? 'bg-blue-100 border-2 border-blue-600' : 'bg-green-100'
              }`}>
                {currentStep === 'select' ? '1' : <CheckCircleIcon className="h-5 w-5" />}
              </div>
              <span className="text-sm font-medium">Select Set</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className={`flex items-center space-x-2 ${
              currentStep === 'direction' ? 'text-blue-600' : 
              currentStep === 'ready' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'direction' ? 'bg-blue-100 border-2 border-blue-600' :
                currentStep === 'ready' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {currentStep === 'ready' ? <CheckCircleIcon className="h-5 w-5" /> : '2'}
              </div>
              <span className="text-sm font-medium">Study Mode</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className={`flex items-center space-x-2 ${currentStep === 'ready' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'ready' ? 'bg-blue-100 border-2 border-blue-600' : 'bg-gray-100'
              }`}>
                3
              </div>
              <span className="text-sm font-medium">Start</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            <div className="flex">
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* Step 1: List Selection */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <BookOpenIcon className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Select Flashcard Set</h2>
            </div>

            {lists.length === 0 ? (
              <div className="text-center py-8">
                <BookOpenIcon className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No flashcard sets found</h3>
                <p className="text-gray-600 mb-4">Create your first set to get started</p>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-gray-900 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                  Import from CSV
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search and Filters */}
                <div className="flex flex-col lg:flex-row gap-3 p-4 bg-gray-50 rounded-lg">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-800" />
                      <input
                        type="text"
                        placeholder="Search flashcard sets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Filtered Results */}
                {filteredLists.length === 0 ? (
                  <div className="text-center py-8">
                    <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No sets match your filters</h3>
                    <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredLists.map((list) => (
                      <div
                        key={list._id?.toString()}
                        onClick={() => setSelectedListId(list._id?.toString() || '')}
                        className={clsx(
                          'p-4 rounded-xl border-2 cursor-pointer transition-all',
                          selectedListId === list._id?.toString()
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{list.title}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{list.cardCount} cards</span>
                              {list.description && (
                                <span className="truncate max-w-xs">{list.description}</span>
                              )}
                            </div>
                          </div>
                          <div className={clsx(
                            'w-5 h-5 rounded-full border-2',
                            selectedListId === list._id?.toString()
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          )}>
                            {selectedListId === list._id?.toString() && (
                              <CheckCircleIcon className="w-3 h-3 text-white m-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <Link
                  href="/generate"
                  className="block p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 bg-gray-100 p-2 rounded-lg">
                      <CloudArrowUpIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Create or Import a New Set</h3>
                      <p className="text-sm text-gray-600">Generate with AI or import from CSV</p>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Study Direction */}
        {currentStep !== 'select' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <SparklesIcon className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Choose Study Direction</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleDirectionChange('front-to-back')}
                  className={clsx(
                    'p-6 rounded-xl border-2 text-left transition-all',
                    studyDirection === 'front-to-back'
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Front → Back</h3>
                    <ArrowRightIcon className="h-5 w-5 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    See the question first, then reveal the answer. Perfect for testing recall.
                  </p>
                </button>

                <button
                  onClick={() => handleDirectionChange('back-to-front')}
                  className={clsx(
                    'p-6 rounded-xl border-2 text-left transition-all relative',
                    studyDirection === 'back-to-front'
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
                    status !== 'authenticated' && 'opacity-75'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Back → Front</h3>
                    <div className="flex items-center space-x-2">
                      {status !== 'authenticated' && <LockClosedIcon className="h-4 w-4 text-amber-600" />}
                      <ArrowRightIcon className="h-5 w-5 text-gray-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    See the answer first, then test if you know the question. Great for reverse learning.
                  </p>
                  {status !== 'authenticated' && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">Premium</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Start Session */}
        {currentStep === 'ready' && selectedList && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-200">
            <div className="p-6">
              <div className="text-center">
                <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
                  <PlayIcon className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Ready to Study!</h2>
                <p className="text-gray-600 mb-6">
                  You&apos;ll study <span className="font-semibold">{selectedList.title}</span> with{' '}
                  <span className="font-semibold">{selectedList.cardCount} cards</span> in{' '}
                  <span className="font-semibold">
                    {studyDirection === 'front-to-back' ? 'Front → Back' : 'Back → Front'}
                  </span> mode.
                </p>
                
                <button
                  onClick={handleStartSession}
                  disabled={isLoading}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Starting Session...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Start Studying
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CsvImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />
      
      <SignUpModal isOpen={showSignUpModal} onClose={() => setShowSignUpModal(false)} />
    </>
  );
}