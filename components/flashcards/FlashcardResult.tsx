/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { IFlashcardClient } from '@/types/flashcard';

interface FlashcardResultProps {
  flashcards: IFlashcardClient[];
  initialTitle: string;
  source: string;
  onSaveSuccess: () => void;
}

export function FlashcardResult({ flashcards, initialTitle, source, onSaveSuccess }: FlashcardResultProps) {
  const [setTitle, setSetTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (flashcards.length === 0) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/flashcard-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: setTitle, 
          flashcards,
          source 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save flashcards');
      }

      setSuccess(true);
      setTimeout(() => {
        onSaveSuccess();
        setSuccess(false);
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <CheckCircleIcon className="h-8 w-8 text-green-600" />
          <div>
            <h3 className="text-xl font-bold text-green-900">
              Generated {flashcards.length} Flashcards!
            </h3>
            <p className="text-green-700">Review and save your new study set</p>
          </div>
        </div>
      </div>

      {/* Save Form */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="setTitle" className="block text-sm font-semibold text-gray-900 mb-2">
              Set Title
            </label>
            <div className="relative">
              <PencilIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="setTitle"
                type="text"
                value={setTitle}
                onChange={(e) => setSetTitle(e.target.value)}
                className="pl-10 block w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3"
                required
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={isSaving || success}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
              success
                ? 'bg-green-600 text-white'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
            }`}
            whileHover={!isSaving && !success ? { scale: 1.02 } : {}}
            whileTap={!isSaving && !success ? { scale: 0.98 } : {}}
          >
            {success ? (
              <div className="flex items-center justify-center space-x-2">
                <CheckCircleIcon className="h-5 w-5" />
                <span>Saved Successfully!</span>
              </div>
            ) : isSaving ? (
              'Saving...'
            ) : (
              'Save Flashcard Set'
            )}
          </motion.button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}
      </div>

      {/* Flashcards Preview */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900">Preview ({flashcards.length} cards)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {flashcards.map((card, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-blue-600 mb-1">FRONT</p>
                  <p className="text-sm font-medium text-gray-900">{card.front}</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-green-600 mb-1">BACK</p>
                  <p className="text-sm text-gray-700">{card.back}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}