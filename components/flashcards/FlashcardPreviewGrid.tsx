'use client';

import { motion, AnimatePresence } from 'framer-motion';
import FlashcardCard from './FlashcardCard';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardPreviewGridProps {
  flashcards: Flashcard[];
}

/**
 * Displays a grid of flashcard previews. Each card can be clicked
 * individually to flip between question and answer.
 * 
 * @param flashcards - Array of flashcard objects with front and back properties
 */
export default function FlashcardPreviewGrid({ flashcards }: FlashcardPreviewGridProps) {
  // If no flashcards, don't show anything
  if (flashcards.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Preview Your Flashcards
          </h2>
          <p className="text-gray-600">
            Click any card to flip between question and answer
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {flashcards.length} flashcard{flashcards.length === 1 ? '' : 's'} created
          </p>
        </div>
        
        {/* Grid of cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashcards.map((card, index) => (
            <FlashcardCard
              key={index}
              front={card.front}
              back={card.back}
              index={index}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}