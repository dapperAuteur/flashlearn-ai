'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { Flashcard } from '@/types/flashcard';
import ConfidenceScale from './ConfidenceScale';

interface StudyCardProps {
  flashcard: Flashcard;
  isFlipped: boolean;
  canFlip: boolean; // NEW: Controls if card can be flipped
  onFlip: () => void;
  onResult: (isCorrect: boolean, timeSeconds: number) => void;
  onConfidenceSelect: (rating: number) => void; // NEW: Confidence handler
  onPrevious: () => void;
  onEndSession: () => void;
  isConfidenceRequired: boolean; // NEW: Show confidence UI
  hasCompletedConfidence: boolean; // NEW: Has user rated confidence
}

export default function StudyCard({
  flashcard,
  isFlipped,
  canFlip,
  onFlip,
  onResult,
  onConfidenceSelect,
  onPrevious,
  onEndSession,
  isConfidenceRequired,
  hasCompletedConfidence
}: StudyCardProps) {
  const [startTime, setStartTime] = useState<number>(Date.now());
  const cardId = String(flashcard._id);

  // REMOVED: The useEffect that controlled isFlipped is gone.
  // The only responsibility of this effect is to reset the timer.
  useEffect(() => {
    setStartTime(Date.now());
  }, [cardId]);

  const handleResult = useCallback((correct: boolean) => {
    const timeSeconds = Math.round((Date.now() - startTime) / 1000);
    Logger.log(LogContext.STUDY, "Result selected", { cardId, correct, timeSeconds });
    onResult(correct, timeSeconds);
  }, [startTime, cardId, onResult]);

  const handleFlip = useCallback(() => {
    if (canFlip) {
      onFlip();
    }
  }, [canFlip, onFlip]);

  // MODIFIED: The keydown handler now calls the onFlip prop.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }
      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault();
          handleFlip();
          break;
        // ... (other cases remain the same)
        case 'ArrowLeft':
        case '1':
          if (isFlipped && hasCompletedConfidence) handleResult(false);
          break;
        case 'ArrowRight':
        case '2':
          if (isFlipped && hasCompletedConfidence) handleResult(true);
          break;
        case 'ArrowUp':
          onPrevious();
          break;
        case 'Escape':
          onEndSession();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, hasCompletedConfidence, handleResult, onPrevious, onEndSession, handleFlip]);

  console.log('StudyCard props:', { 
    isConfidenceRequired, 
    hasCompletedConfidence, 
    isFlipped 
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4 flex justify-between items-center" title="Space: Flip, ←/1: Wrong, →/2: Right, ↑: Previous, Esc: End">
        <div className="text-white">
          {!canFlip ? 'Rate confidence first' : 'Tap card to flip'}
        </div>
        <div className="text-sm text-gray-400">
          Keyboard: Space, &larr;, &rarr;, &uarr;, Esc
        </div>
      </div>
      {/* NEW: Confidence Rating - Only show for paid users before flip */}
      {isConfidenceRequired && !isFlipped && (
        <ConfidenceScale 
          onRatingSelect={onConfidenceSelect}
          disabled={!isConfidenceRequired}
        />
      )}

      <div className="mb-8">
        {/* MODIFIED: The onClick handler now calls the onFlip prop */}
        <motion.div
          className={`w-full h-80 perspective-1000 ${canFlip ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
          onClick={handleFlip}
        >
          {/* MODIFIED: The animation directly uses the isFlipped prop */}
          <motion.div
            className="relative w-full h-full transform-style-preserve-3d transition-transform duration-500"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
          >
            {/* Front of card */}
            <div className="absolute w-full h-full backface-hidden bg-gray-700 border border-gray-200 rounded-lg p-6 flex flex-col justify-center shadow-md">
              <div className="overflow-auto">
                <div 
                  className="text-center text-lg prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: flashcard.front }}
                />
                {flashcard.frontImage && (
                  <div className="mt-4 flex justify-center">
                    <Image 
                      src={flashcard.frontImage} 
                      alt="Front visual" 
                      className="max-h-48 object-contain" 
                      width={400} 
                      height={400} 
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Back of card */}
            <motion.div 
              className="absolute w-full h-full backface-hidden bg-gray-800 border border-gray-600 rounded-lg p-6 flex flex-col justify-center shadow-md"
              style={{ rotateY: 180 }}
            >
              <div className="overflow-auto">
                <div 
                  className="text-center text-lg prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: flashcard.back }}
                />
                {flashcard.backImage && (
                  <div className="mt-4 flex justify-center">
                    <Image 
                      src={flashcard.backImage} 
                      alt="Back visual" 
                      className="max-h-48 object-contain" 
                      width={400} 
                      height={400} 
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
      {/* Answer buttons - only show when flipped and confidence completed */}
      {isFlipped && hasCompletedConfidence && (
        <div className="flex space-x-4 justify-center">
          <button 
            onClick={() => handleResult(false)} 
            className="px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Got it Wrong
          </button>
          <button 
            onClick={() => handleResult(true)} 
            className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Got it Right
          </button>
        </div>
      )}
    </div>
  );
}