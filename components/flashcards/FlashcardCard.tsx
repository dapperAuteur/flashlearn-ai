'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface FlashcardCardProps {
  front: string;
  back: string;
  index: number;
}

/**
 * A single flashcard that can be clicked to toggle between front (question)
 * and back (answer). Uses simple show/hide instead of 3D flip animation.
 * 
 * @param front - The question text
 * @param back - The answer text
 * @param index - Card position (used for staggered animation on load)
 */
export default function FlashcardCard({ front, back, index }: FlashcardCardProps) {
  // Track if this specific card is showing its back side
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      // Stagger the cards appearing: first card appears immediately,
      // second card waits 0.1 seconds, third waits 0.2 seconds, etc.
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 h-48"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      {/* Simple approach: Show front OR back, not both at once */}
      {!isFlipped ? (
        // FRONT SIDE (Question)
        <div className="h-full p-6 flex flex-col justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-center mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              Question
            </span>
          </div>
          <div className="text-center font-medium text-gray-900 overflow-y-auto">
            {front}
          </div>
          <div className="text-center text-xs text-gray-500 mt-2">
            Click to see answer
          </div>
        </div>
      ) : (
        // BACK SIDE (Answer)
        <div className="h-full p-6 flex flex-col justify-center bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="text-center mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              Answer
            </span>
          </div>
          <div className="text-center text-gray-800 overflow-y-auto">
            {back}
          </div>
          <div className="text-center text-xs text-gray-500 mt-2">
            Click to see question
          </div>
        </div>
      )}
    </motion.div>
  );
}