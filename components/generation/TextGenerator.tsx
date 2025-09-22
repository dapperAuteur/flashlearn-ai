/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, PencilIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { FlashcardResult } from '@/components/flashcards/FlashcardResult';
import { IFlashcardClient } from '@/types/flashcard';

interface TextGeneratorProps {
  onBack: () => void;
}

export default function TextGenerator({ onBack }: TextGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [flashcards, setFlashcards] = useState<IFlashcardClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);

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
      const response = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate flashcards.');
      }

      const data = await response.json();
      setFlashcards(data.flashcards);
      
      // Refresh rate limit status
      checkRateLimit();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const examples = [
    'The key events of the American Revolution',
    'Basic concepts of photosynthesis',
    'Spanish vocabulary for beginners',
    'JavaScript array methods and their uses',
    'Ancient Greek mythology gods and goddesses'
  ];

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
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Text Prompt
          </h2>
          <p className="text-gray-600 mt-1">Generate flashcards from any topic or text</p>
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
            <label htmlFor="prompt" className="block text-lg font-semibold text-gray-900 mb-3">
              What would you like to study?
            </label>
            <div className="relative">
              <PencilIcon className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
              <textarea
                id="prompt"
                name="prompt"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter a topic, paste text, or describe what you want to learn..."
                className="pl-12 block w-full rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg p-4 transition-all"
                required
                disabled={rateLimitExceeded}
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading || rateLimitExceeded}
            className={`w-full py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-200 ${
              rateLimitExceeded
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
            }`}
            whileHover={!isLoading && !rateLimitExceeded ? { scale: 1.02 } : {}}
            whileTap={!isLoading && !rateLimitExceeded ? { scale: 0.98 } : {}}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <SparklesIcon className="h-5 w-5 animate-spin" />
                <span>Generating Flashcards...</span>
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

      {/* Examples */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <SparklesIcon className="h-5 w-5 text-blue-600 mr-2" />
          Example topics to try:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {examples.map((example, index) => (
            <motion.button
              key={index}
              onClick={() => !rateLimitExceeded && setPrompt(example)}
              className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-sm"
              whileHover={{ scale: 1.02 }}
              disabled={rateLimitExceeded}
            >
              &quot;{example}&quot;
            </motion.button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center space-x-3 bg-blue-50 px-6 py-3 rounded-xl border border-blue-200">
            <SparklesIcon className="h-6 w-6 text-blue-600 animate-spin" />
            <span className="text-blue-800 font-medium">Creating your flashcards...</span>
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
        initialTitle={prompt} 
        source="Text Prompt" 
        onSaveSuccess={() => { 
          setFlashcards([]); 
          setPrompt(''); 
          checkRateLimit();
        }} 
      />
    </div>
  );
}