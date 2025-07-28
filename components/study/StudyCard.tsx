// components/study/StudyCard.tsx
'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { Flashcard } from '@/types/flashcard';

// interface StudySessionProps {
//   flashcards: Flashcard[];
// }

interface StudyCardProps {
  flashcard: Flashcard;
  onResult: (isCorrect: boolean, timeSeconds: number) => void;
}

export default function StudyCard({ flashcard, onResult }: StudyCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  const cardId = String(flashcard._id);
  
  // Reset timer when a new flashcard is shown
  useEffect(() => {
    setIsFlipped(false);
    setStartTime(Date.now());
  }, [cardId]);

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      Logger.log(LogContext.STUDY, "Card flipped", { cardId });
    }
  };

  const handleResult = (correct: boolean) => {
    // Calculate time spent on this card in seconds
    const timeSeconds = Math.round((Date.now() - startTime) / 1000);
    
    Logger.log(LogContext.STUDY, "Result selected", { 
      cardId,
      correct,
      timeSeconds
    });
    
    onResult(correct, timeSeconds);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <div className="text-white">
          Tap card to flip
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
                  className="text-center text-lg prose max-w-none"
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
            <div className="bg-gray-800 absolute w-full h-full backface-hidden bg-blue-50 border border-blue-200 rounded-lg p-6 flex flex-col justify-center shadow-md rotate-y-180">
              <div className="overflow-auto">
                <div 
                  className="text-center text-lg prose max-w-none"
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
            </div>
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