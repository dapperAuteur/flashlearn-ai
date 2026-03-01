'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useFlashcards } from '@/contexts/FlashcardContext';
import ChallengeShareModal from '@/components/versus/ChallengeShareModal';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  BookOpenIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

type StudyMode = 'classic' | 'multiple-choice';
type StudyDirection = 'front-to-back' | 'back-to-front';
type Scope = 'direct' | 'classroom' | 'public';

interface CreatedChallenge {
  _id: string;
  challengeCode: string;
  setName: string;
}

export default function CreateChallengePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { flashcardSets } = useFlashcards();
  const userId = session?.user?.id || '';

  // Wizard state
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Select flashcard set
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Step 2: Study mode and direction
  const [studyMode, setStudyMode] = useState<StudyMode>('classic');
  const [studyDirection, setStudyDirection] = useState<StudyDirection>('front-to-back');

  // Step 3: Scope and participants
  const [scope, setScope] = useState<Scope>('direct');
  const [maxParticipants, setMaxParticipants] = useState(2);

  // Step 4: Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdChallenge, setCreatedChallenge] = useState<CreatedChallenge | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Filter sets owned by user with a search query
  const userSets = useMemo(() => {
    const owned = flashcardSets.filter((s) => s.user_id === userId);
    if (!searchQuery.trim()) return owned;
    const q = searchQuery.toLowerCase();
    return owned.filter((s) => s.title.toLowerCase().includes(q));
  }, [flashcardSets, userId, searchQuery]);

  const selectedSet = flashcardSets.find((s) => s.id === selectedSetId);

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return selectedSetId !== null;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps && canProceed()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSetId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/versus/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardSetId: selectedSetId,
          studyMode,
          studyDirection,
          scope,
          maxParticipants: scope === 'direct' ? maxParticipants : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.message || 'Failed to create challenge');
        return;
      }

      setCreatedChallenge({
        _id: data.challenge._id,
        challengeCode: data.challenge.challengeCode,
        setName: data.challenge.setName,
      });
      setShowShareModal(true);
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back to Versus */}
      <button
        onClick={() => router.push('/versus')}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Versus
      </button>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create a Challenge</h1>
        <p className="text-sm text-gray-600 mt-1">
          Set up a versus challenge and share it with others.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const s = i + 1;
          const isActive = s === step;
          const isCompleted = s < step;

          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-colors ${
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : isActive
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircleIcon className="h-5 w-5" />
                ) : (
                  s
                )}
              </div>
              {s < totalSteps && (
                <div
                  className={`flex-1 h-0.5 ${
                    isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-gray-500">
        Step {step} of {totalSteps}
      </p>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {/* Step 1: Select Flashcard Set */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Choose a Flashcard Set</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select the set you want to use for this challenge.
            </p>

            {/* Search */}
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search your sets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Set List */}
            {userSets.length === 0 ? (
              <div className="text-center py-8">
                <BookOpenIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'No sets match your search.' : 'You have no flashcard sets yet.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-2 max-h-80 overflow-y-auto">
                {userSets.map((set) => {
                  const isSelected = selectedSetId === set.id;
                  return (
                    <button
                      key={set.id}
                      onClick={() => setSelectedSetId(set.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {set.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {set.card_count || 0} cards
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Study Mode & Direction */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Study Mode & Direction</h2>
            <p className="text-sm text-gray-500 mb-6">
              Choose how participants will study the flashcards.
            </p>

            {/* Study Mode */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Study Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStudyMode('classic')}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    studyMode === 'classic'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <BookOpenIcon className="h-6 w-6 text-blue-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900">Classic</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Flip cards and self-grade your answers
                  </p>
                </button>
                <button
                  onClick={() => setStudyMode('multiple-choice')}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    studyMode === 'multiple-choice'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-gray-900">Multiple Choice</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose from auto-generated options
                  </p>
                </button>
              </div>
            </div>

            {/* Study Direction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Direction</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStudyDirection('front-to-back')}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    studyDirection === 'front-to-back'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">Front to Back</p>
                  <p className="text-xs text-gray-500 mt-1">See the front, recall the back</p>
                </button>
                <button
                  onClick={() => setStudyDirection('back-to-front')}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    studyDirection === 'back-to-front'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">Back to Front</p>
                  <p className="text-xs text-gray-500 mt-1">See the back, recall the front</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Scope & Participants */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Challenge Scope</h2>
            <p className="text-sm text-gray-500 mb-6">
              Choose who can join this challenge.
            </p>

            {/* Scope Selection */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setScope('direct')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                  scope === 'direct'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <UserIcon className="h-6 w-6 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Direct Challenge</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Share a code with specific people you want to challenge
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setScope('classroom')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                  scope === 'classroom'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AcademicCapIcon className="h-6 w-6 text-purple-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Classroom</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Visible to members of your classroom
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setScope('public')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                  scope === 'public'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <GlobeAltIcon className="h-6 w-6 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Public</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Anyone can find and join this challenge
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Max Participants (only for direct) */}
            {scope === 'direct' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Participants
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={2}
                    max={10}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(parseInt(e.target.value, 10))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm font-semibold text-gray-900 w-8 text-center">
                    {maxParticipants}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Free tier: up to 5 participants. Upgrade for more.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Confirm Your Challenge</h2>
            <p className="text-sm text-gray-500 mb-6">
              Review the details and create your challenge.
            </p>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Flashcard Set</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedSet?.title || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Cards</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedSet?.card_count || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Study Mode</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {studyMode === 'multiple-choice' ? 'Multiple Choice' : 'Classic'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Direction</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {studyDirection === 'front-to-back' ? 'Front to Back' : 'Back to Front'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Scope</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">{scope}</span>
                </div>
                {scope === 'direct' && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Max Participants</span>
                    <span className="text-sm font-medium text-gray-900">{maxParticipants}</span>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Challenge'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {!createdChallenge && (
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back
          </button>

          {step < totalSteps && (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </button>
          )}
        </div>
      )}

      {/* Share Modal */}
      {createdChallenge && (
        <ChallengeShareModal
          isOpen={showShareModal}
          challengeCode={createdChallenge.challengeCode}
          challengeUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/versus/join/${createdChallenge.challengeCode}`}
          onClose={() => {
            setShowShareModal(false);
            router.push('/versus');
          }}
        />
      )}
    </div>
  );
}
