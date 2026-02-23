'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useStudySession } from '@/contexts/StudySessionContext';
import { useFlashcards } from '@/contexts/FlashcardContext';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import SignUpModal from '@/components/ui/SignUpModal';
import clsx from 'clsx';
import Link from 'next/link';
import {
  BookOpenIcon,
  PlayIcon,
  CloudArrowUpIcon,
  SparklesIcon,
  ArrowRightIcon,
  LockClosedIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  AcademicCapIcon,
  ListBulletIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

interface StudySessionSetupProps {
  preSelectedSetId?: string;
}

export default function StudySessionSetup({ preSelectedSetId }: StudySessionSetupProps) {
  const { startSession, isLoading, studyDirection, setStudyDirection, studyMode, setStudyMode } = useStudySession();
  const { flashcardSets } = useFlashcards();
  const { status } = useSession();

  const [selectedListId, setSelectedListId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<'select' | 'direction' | 'ready'>('select');
  const [searchTerm, setSearchTerm] = useState('');
  const [dueCounts, setDueCounts] = useState<Map<string, number>>(new Map());
  const [assignments, setAssignments] = useState<Array<{
    _id: string;
    title: string;
    flashcardSetId: { _id: string; title: string; cardCount: number };
    classroomId: { _id: string; name: string };
    teacherId?: { name: string };
    dueDate?: string;
    myStatus: string;
  }>>([]);

  // Pre-select set if provided via URL query param
  useEffect(() => {
    if (preSelectedSetId && !selectedListId) {
      setSelectedListId(preSelectedSetId);
      setCurrentStep('direction');
    }
  }, [preSelectedSetId, selectedListId]);

  useEffect(() => {
    if (selectedListId && currentStep === 'select') {
      setCurrentStep('direction');
    }
  }, [selectedListId, currentStep]);

  // Fetch due card counts and assignments for authenticated users
  useEffect(() => {
    if (status !== 'authenticated') return;

    fetch('/api/study/due-cards')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.sets) {
          const map = new Map<string, number>();
          for (const s of data.sets) map.set(s.setId, s.dueCount);
          setDueCounts(map);
        }
      })
      .catch(() => { /* silent */ });

    fetch('/api/assignments')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.assignments) {
          // Only show assignments that are not completed
          setAssignments(
            data.assignments.filter(
              (a: { myStatus?: string }) => a.myStatus && a.myStatus !== 'completed'
            )
          );
        }
      })
      .catch(() => { /* silent */ });
  }, [status]);

  const handleStartSession = async () => {
    if (!selectedListId) {
      setError('Please select a list to study');
      return;
    }
    
    setError(null);
    
    // Check if offline and set not available
    // if (!navigator.onLine) {
    //   const isSetOffline = offlineSets.some(s => s.set_id === selectedListId);
      
    //   if (!isSetOffline) {
    //     setError('You are offline and this set is not available for offline study.');
    //     return;
    //   }
    // }
    
    await startSession(selectedListId, studyDirection);
  };

  const handleDirectionChange = (direction: 'front-to-back' | 'back-to-front') => {
    if (status !== 'authenticated' && direction === 'back-to-front') {
      setShowSignUpModal(true);
      Logger.log(LogContext.STUDY, "Unauthenticated user clicked premium feature");
    } else {
      setStudyDirection(direction);
      setCurrentStep('ready');
    }
  };

  // Filter lists
  // Filter sets - only PowerSync sets
  const filteredSets = useMemo(() => {
    return flashcardSets.filter(set => {
      const matchesSearch = set.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           set.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [flashcardSets, searchTerm]);

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
            {error}
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

            {filteredSets.length === 0 ? (
              <div className="text-center py-8">
                <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No flashcard sets found</h3>
                <p className="text-gray-600 mb-4">Create your first set to get started</p>
                <Link
                  href="/generate"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                  Create New Set
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search flashcard sets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                {/* Assigned Sets */}
                {assignments.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                      <AcademicCapIcon className="h-4 w-4" />
                      <span>Assigned to You</span>
                    </div>
                    {assignments.map((a) => (
                      <div
                        key={a._id}
                        onClick={() => setSelectedListId(a.flashcardSetId?._id || '')}
                        className={clsx(
                          'p-4 rounded-xl border-2 cursor-pointer transition-all',
                          selectedListId === a.flashcardSetId?._id
                            ? 'border-purple-500 bg-purple-50 shadow-md'
                            : 'border-purple-200 bg-purple-50/30 hover:border-purple-300 hover:shadow-sm'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-gray-900 truncate">{a.flashcardSetId?.title}</h3>
                              <span className={clsx(
                                'text-xs px-2 py-0.5 rounded-full flex-shrink-0',
                                a.myStatus === 'in_progress'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-600'
                              )}>
                                {a.myStatus === 'in_progress' ? 'In Progress' : 'Not Started'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {a.title} &middot; {a.classroomId?.name}
                              {a.teacherId?.name && ` · ${a.teacherId.name}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">{a.flashcardSetId?.cardCount} cards</span>
                              {a.dueDate && (
                                <span className={clsx(
                                  'text-xs px-2 py-0.5 rounded-full',
                                  new Date(a.dueDate) < new Date()
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-600'
                                )}>
                                  Due {new Date(a.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={clsx(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3',
                            selectedListId === a.flashcardSetId?._id
                              ? 'bg-purple-600 border-purple-600'
                              : 'border-gray-300'
                          )}>
                            {selectedListId === a.flashcardSetId?._id && (
                              <CheckCircleIcon className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredSets.length > 0 && (
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mt-4">
                        <BookOpenIcon className="h-4 w-4" />
                        <span>Your Sets</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Filtered Results */}
                {filteredSets.length === 0 ? (
                  <div className="text-center py-8">
                    <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No sets match your search</h3>
                    <p className="text-gray-600">Try a different search term</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSets.map((set) => (
                      <div
                        key={set.id?.toString()}
                        onClick={() => setSelectedListId(set.id?.toString() || '')}
                        className={clsx(
                          'p-4 rounded-xl border-2 cursor-pointer transition-all',
                          selectedListId === set.id?.toString()
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{set.title}</h3>
                            {set.description && (
                              <p className="text-sm text-gray-600 mt-1">{set.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-xs text-gray-500">{set.card_count} cards</p>
                              {dueCounts.get(set.id?.toString() || '') && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                  <ClockIcon className="h-3 w-3" />
                                  {dueCounts.get(set.id?.toString() || '')} due
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={clsx(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                            selectedListId === set.id?.toString()
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          )}>
                            {selectedListId === set.id?.toString() && (
                              <CheckCircleIcon className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <Link
                  href="/generate"
                  className="block p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-100 p-2 rounded-lg">
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
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  )}
                >
                  {status !== 'authenticated' && (
                    <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                      <LockClosedIcon className="h-3 w-3 mr-1" />
                      Sign up
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Back → Front</h3>
                    <ArrowRightIcon className="h-5 w-5 text-gray-600 transform rotate-180" />
                  </div>
                  <p className="text-sm text-gray-600">
                    See the answer first, then the question. Great for reverse learning.
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Study Mode Selection */}
        {currentStep === 'ready' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <ListBulletIcon className="h-5 w-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Study Mode</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setStudyMode('classic')}
                  className={clsx(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    studyMode === 'classic'
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <SparklesIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Classic</h3>
                  </div>
                  <p className="text-xs text-gray-600">Flip cards and self-grade</p>
                </button>

                <button
                  onClick={() => setStudyMode('multiple-choice')}
                  className={clsx(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    studyMode === 'multiple-choice'
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ListBulletIcon className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Multiple Choice</h3>
                  </div>
                  <p className="text-xs text-gray-600">AI-generated answer options</p>
                </button>

                <button
                  onClick={() => setStudyMode('type-answer')}
                  className={clsx(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    studyMode === 'type-answer'
                      ? 'border-orange-500 bg-orange-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <PencilSquareIcon className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Type Answer</h3>
                  </div>
                  <p className="text-xs text-gray-600">Type your answer, AI evaluates</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Start Button */}
        {currentStep === 'ready' && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Start!</h2>
            <p className="text-blue-100 mb-6">
              You&apos;re about to study {filteredSets.find(l => l.id?.toString() === selectedListId)?.card_count} flashcards
              {studyMode !== 'classic' && <span className="block text-sm mt-1">Mode: {studyMode === 'multiple-choice' ? 'Multiple Choice' : 'Type Answer'}</span>}
            </p>
            <button
              onClick={handleStartSession}
              disabled={isLoading}
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              <PlayIcon className="h-5 w-5 mr-2" />
              {isLoading ? 'Starting...' : 'Begin Study Session'}
            </button>
          </div>
        )}
      </div>

      <SignUpModal 
        isOpen={showSignUpModal} 
        onClose={() => setShowSignUpModal(false)} 
      />
    </>
  );
}