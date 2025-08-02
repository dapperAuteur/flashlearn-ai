'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { Flashcard } from '@/types/flashcard';

// interface StudySessionProps {
//   flashcards: Flashcard[];
// }

interface StudyCardProps {
  flashcard: Flashcard;
  onResult: (isCorrect: boolean, timeSeconds: number) => void;
  onPrevious: () => void;
  onEndSession: () => void;
}

export default function StudyCard({ 
  flashcard, 
  onResult,
  onPrevious,
  onEndSession
}: StudyCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  const cardId = String(flashcard._id);
  
  // Reset timer when a new flashcard is shown
  useEffect(() => {
    setIsFlipped(false);
    setStartTime(Date.now());
  }, [cardId]);

  const handleFlip = useCallback(() => {
    if (!isFlipped) {
      setIsFlipped(true);
      Logger.log(LogContext.STUDY, "Card flipped", { cardId });
    }
  }, [isFlipped, cardId]);

  const handleResult = useCallback((correct: boolean) => {
    // Calculate time spent on this card in seconds
    const timeSeconds = Math.round((Date.now() - startTime) / 1000);
    
    Logger.log(LogContext.STUDY, "Result selected", { 
      cardId,
      correct,
      timeSeconds
    });
    
    onResult(correct, timeSeconds);
  }, [startTime, cardId, onResult]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore keyboard events if an input element is focused
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault(); // Prevent default space bar scroll
          handleFlip();
          break;
        case 'ArrowLeft':
        case '1':
          if (isFlipped) handleResult(false);
          break;
        case 'ArrowRight':
        case '2':
          if (isFlipped) handleResult(true);
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
  }, [isFlipped, handleFlip, handleResult, onPrevious, onEndSession]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4 flex justify-between items-center" title="Space: Flip, ←/1: Wrong, →/2: Right, ↑: Previous, Esc: End">
        <div className="text-white">Tap card to flip</div>
        <div className="text-sm text-gray-400">
          Keyboard: Space, &larr;, &rarr;, &uarr;, Esc
        </div>
      </div>
      
      <div className="mb-8">
        <motion.div
          className="w-full h-80 cursor-pointer perspective-1000"
          onClick={handleFlip}
        >
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
      
      {isFlipped && (
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