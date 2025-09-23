/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  BookmarkIcon, 
  ShareIcon, 
  PlayIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';
import Link from 'next/link';
import ShareModal from '@/components/ShareModal';
import { IFlashcardClient as IFlashcard } from '@/types/flashcard';
import { Logger, LogContext } from '@/lib/logging/client-logger';

interface FlashcardResultProps {
  flashcards: IFlashcard[];
  initialTitle: string;
  source: 'Text Prompt' | 'PDF' | 'YouTube' | 'Audio' | 'Image' | 'CSV' | 'Text' | 'Video';
  savedSetData: SavedSetData | null;
  setSavedSetData: React.Dispatch<React.SetStateAction<SavedSetData | null>>;
  onSaveSuccess: (setData: SavedSetData) => void;
  onStartOver: () => void;
}

interface SavedSetData {
  _id: string;
  title: string;
  isPublic: boolean;
  cardCount: number;
}

export function FlashcardResult({ 
  flashcards, 
  initialTitle, 
  source,
  savedSetData,
  setSavedSetData,
  onSaveSuccess,
  onStartOver 
}: FlashcardResultProps) {
  const { data: session, status } = useSession();
  
  // Form state
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Preview state
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const toggleCardFlip = (index: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setSaveError('Title is required');
      return;
    }

    if (flashcards.length === 0) {
      setSaveError('At least one flashcard is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Convert IFlashcard[] to the format expected by the API
      const flashcardsForApi = flashcards.map(card => ({
        front: card.front,
        back: card.back
        // Note: We don't send _id since the API will create new ones
      }));

      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          isPublic,
          flashcards: flashcardsForApi
        }),
      });

      const data = await response.json();
      console.log('API Response data:', data);
      console.log('savedSet object:', data.savedSet);
console.log('savedSet._id:', data.savedSet._id);
console.log('savedSet.title:', data.savedSet.title);

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      console.log('About to create savedSet object');
      // Success! Store the saved set data
      const savedSet: SavedSetData = {
        _id: data.savedSet._id,
        title: data.savedSet.title,
        isPublic: data.savedSet.isPublic,
        cardCount: data.savedSet.cardCount || flashcards.length
      };
      console.log('Created savedSet:', savedSet);

      setSavedSetData(savedSet);
      onSaveSuccess(savedSet);
      console.log('Called setSavedSetData');
      Logger.info(LogContext.FLASHCARD, 'FlashcardSet saved successfully', { 
        setId: savedSet._id,
        source,
        cardCount: savedSet.cardCount,
        isPublic: savedSet.isPublic
      });

      console.log('128 FlashcardResult render:', { 
        flashcardsLength: flashcards.length, 
        // savedSetData, 
        isSaving 
      });

      // Call the success callback to reset parent state
      console.log('136 FlashcardResult render:', { 
        flashcardsLength: flashcards.length, 
        // savedSetData, 
        isSaving 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save flashcard set';
      setSaveError(errorMessage);
      Logger.error(LogContext.FLASHCARD, 'Error saving FlashcardSet', { error, source });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartOverLocal = () => {
    setSaveError(null);
    setFlippedCards(new Set());
    setTitle(initialTitle);
    setDescription('');
    setIsPublic(false);
    onStartOver();
  };

  // Show success screen after saving
  if (savedSetData) {
    const shareUrl = `${window.location.origin}/sets/${savedSetData._id}`;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg border border-green-200 p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookmarkIcon className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Flashcard Set Saved!
          </h3>
          <p className="text-gray-600">
            &quot;{savedSetData.title}&quot; with {savedSetData.cardCount} cards has been saved to your account.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Study This Set */}
          <Link
            href={`/study/${savedSetData._id}`}
            className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            Study This Set
          </Link>
          <Link
              href="/study"
              className="flex items-center justify-center px-6 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <BookmarkIcon className="h-5 w-5 mr-2" />
              Browse Sets
            </Link>

          {/* Share This Set (only if public) */}
          {savedSetData.isPublic && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center justify-center px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <ShareIcon className="h-5 w-5 mr-2" />
              Share This Set
            </button>
          )}

          {/* Browse Public Sets (fallback if not public) */}
          {!savedSetData.isPublic && (
            <Link
              href="/study"
              className="flex items-center justify-center px-6 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <BookmarkIcon className="h-5 w-5 mr-2" />
              Browse Sets
            </Link>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={handleStartOverLocal}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Create Another Set
          </button>
        </div>

        {/* Share Modal */}
        {savedSetData.isPublic && (
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            shareUrl={shareUrl}
            title={savedSetData.title}
          />
        )}
      </motion.div>
    );
  }

  // Show the save form if we have flashcards but haven't saved yet
  // if (flashcards.length === 0 && !savedSetData) {
  if (flashcards.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Save Form */}
      <div className="bg-white rounded-lg shadow-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Save Your Flashcard Set
        </h3>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="setTitle" className="block text-sm font-medium text-gray-700 mb-2">
              Set Title *
            </label>
            <div className="relative">
              <PencilIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="setTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your flashcard set"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="setDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="setDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description to help others understand this set"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSaving}
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                {isPublic ? (
                  <EyeIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {isPublic ? 'Public Set' : 'Private Set'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isPublic 
                  ? 'Others can discover and study this set' 
                  : 'Only you can access this set'
                }
              </p>
            </div>
            <Switch
              checked={isPublic}
              onChange={setIsPublic}
              disabled={isSaving}
              className={`${
                isPublic ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50`}
            >
              <span
                className={`${
                  isPublic ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving || status !== 'authenticated' || !title.trim()}
              className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <BookmarkIcon className="h-5 w-5 mr-2" />
                  Save Flashcard Set
                </>
              )}
            </button>

            {status !== 'authenticated' && (
              <p className="text-sm text-red-600 mt-2 text-center">
                Please <Link href="/auth/signin" className="underline">sign in</Link> to save your flashcard set.
              </p>
            )}
          </div>

          {/* Error Display */}
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Cards */}
      <div className="bg-white rounded-lg shadow-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">
            Preview ({flashcards.length} cards)
          </h4>
          <div className="flex items-center text-sm text-gray-500">
            <EyeIcon className="h-4 w-4 mr-1" />
            Click to flip
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashcards.map((card, index) => {
            const isFlipped = flippedCards.has(index);
            return (
              <motion.div
                key={`preview-${index}`}
                className="relative h-32 cursor-pointer"
                onClick={() => toggleCardFlip(index)}
                style={{ perspective: '1000px' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className={`relative w-full h-full transition-transform duration-500 transform-gpu preserve-3d ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* Front */}
                  <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 flex items-center justify-center shadow-sm">
                    <p className="text-xs text-blue-900 text-center font-medium line-clamp-3">
                      {card.front}
                    </p>
                  </div>
                  {/* Back */}
                  <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3 flex items-center justify-center shadow-sm">
                    <p className="text-xs text-green-900 text-center line-clamp-3">
                      {card.back}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}