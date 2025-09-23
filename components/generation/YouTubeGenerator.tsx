/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, LinkIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { FlashcardResult } from '@/components/flashcards/FlashcardResult';
import { IFlashcardClient as IFlashcard } from '@/types/flashcard';

interface YouTubeGeneratorProps {
  onBack: () => void;
}

interface SavedSetData {
  _id: string;
  title: string;
  isPublic: boolean;
  cardCount: number;
}

export default function YouTubeGenerator({ onBack }: YouTubeGeneratorProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [flashcards, setFlashcards] = useState<IFlashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const [savedSetData, setSavedSetData] = useState<SavedSetData | null>(null);

  useEffect(() => {
    checkRateLimit();
  }, []);

  const checkRateLimit = async () => {
    try {
      const response = await fetch('/api/rate-limit/check');
      const data = await response.json();
      setRateLimitExceeded(!data.allowed);
    } catch (error) {
      console.error('Rate limit check failed:', error);
    }
  };

  const handleSaveSuccess = (setData: SavedSetData) => {
    setSavedSetData(setData);
    // Don't reset flashcards here - let FlashcardResult manage the display
  };
  const handleStartOver = () => {
    setSavedSetData(null);
    setFlashcards([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rateLimitExceeded) {
      setError('Rate limit exceeded. Please wait before generating more flashcards.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFlashcards([]);

    try {
      const response = await fetch('/api/generate-from-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate flashcards from YouTube.');
      }

      const data = await response.json();
      setFlashcards(data.flashcards);
      checkRateLimit();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to options</span>
        </button>
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
            YouTube Video
          </h2>
          <p className="text-gray-600 mt-1">Generate flashcards from video transcripts</p>
        </div>
        <div className="w-24"></div>
      </div>

      {/* Rate Limit Warning */}
      {rateLimitExceeded && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-orange-900 mb-1">Rate Limit Reached</h4>
              <p className="text-orange-800 text-sm">
                You&apos;ve reached the AI generation limit (1 per hour). Please wait before generating more flashcards.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Input Form */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="youtube_url" className="block text-lg font-semibold text-gray-900 mb-3">
              YouTube Video URL
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="youtube_url"
                name="youtube_url"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="pl-12 block w-full rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-lg p-4 transition-all"
                required
                disabled={rateLimitExceeded}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Paste a public YouTube video link. We&apos;ll extract the transcript and generate flashcards.
            </p>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading || rateLimitExceeded}
            className={`w-full py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-200 ${
              rateLimitExceeded
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
            }`}
            whileHover={!isLoading && !rateLimitExceeded ? { scale: 1.02 } : {}}
            whileTap={!isLoading && !rateLimitExceeded ? { scale: 0.98 } : {}}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <SparklesIcon className="h-5 w-5 animate-spin" />
                <span>Fetching & Generating...</span>
              </div>
            ) : rateLimitExceeded ? (
              'Rate Limit Reached'
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <SparklesIcon className="h-5 w-5" />
                <span>Generate Flashcards</span>
              </div>
            )}
          </motion.button>
        </form>
      </div>

      {/* Info */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
        <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
          <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
          How YouTube processing works:
        </h4>
        <ul className="text-sm text-purple-800 space-y-2">
          <li>• Fetches the video transcript automatically</li>
          <li>• AI analyzes the content for key concepts</li>
          <li>• Generates focused flashcards from the material</li>
          <li>• Works best with educational and informational videos</li>
        </ul>
      </div>

      {/* Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center space-x-3 bg-purple-50 px-6 py-3 rounded-xl border border-purple-200">
            <SparklesIcon className="h-6 w-6 text-purple-600 animate-spin" />
            <span className="text-purple-800 font-medium">Processing video transcript...</span>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl"
        >
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </motion.div>
      )}

      {/* Results */}
      <FlashcardResult 
        flashcards={flashcards}
        initialTitle="Flashcards from YouTube"
        source="YouTube"
        onSaveSuccess={handleSaveSuccess}
        savedSetData={null}
        setSavedSetData={setSavedSetData}
        onStartOver={handleStartOver}      />
    </div>
  );
}