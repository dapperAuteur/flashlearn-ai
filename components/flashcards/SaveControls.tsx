'use client';

import { Switch } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface SaveControlsProps {
  flashcardCount: number;
  isPublic: boolean;
  isSaving: boolean;
  onPublicToggle: (value: boolean) => void;
  onSave: () => void;
}

/**
 * Sticky controls for saving flashcard sets. Shows flashcard count,
 * public/private toggle, and save button.
 * 
 * @param flashcardCount - Number of flashcards in the set
 * @param isPublic - Whether the set should be shared publicly
 * @param isSaving - Whether save is in progress
 * @param onPublicToggle - Callback when public toggle changes
 * @param onSave - Callback when save button is clicked
 */
export default function SaveControls({
  flashcardCount,
  isPublic,
  isSaving,
  onPublicToggle,
  onSave,
}: SaveControlsProps) {
  return (
    <AnimatePresence>
      {flashcardCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="sticky top-4 z-10 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-lg mb-8"
        >
          <div className="flex items-center justify-between">
            {/* Left side: Count and toggle */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">
                {flashcardCount} flashcard{flashcardCount === 1 ? '' : 's'} created
              </span>
              
              {/* Public/Private toggle */}
              <Switch.Group as="div" className="flex items-center">
                <Switch
                  checked={isPublic}
                  onChange={onPublicToggle}
                  className={`${
                    isPublic ? 'bg-blue-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <Switch.Label className="ml-3 text-sm font-medium text-gray-700">
                  Share with others
                </Switch.Label>
              </Switch.Group>
            </div>
            
            {/* Right side: Save button */}
            <button 
              onClick={onSave} 
              disabled={isSaving} 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Save to Account
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}