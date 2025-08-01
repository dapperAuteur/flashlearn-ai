'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Flashcard } from '@/types/flashcard';
import { Logger, LogContext } from '@/lib/logging/client-logger';

interface StudyCardProps {
  flashcard: Flashcard;
  onResult: (isCorrect: boolean, timeSeconds: number) => void;
}

export default function StudyCard({ flashcard, onResult }: StudyCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsFlipped(false);
    setStartTime(Date.now());
    cardRef.current?.focus();
  }, [flashcard]);

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      Logger.log(LogContext.STUDY, "Card flipped", { cardId: flashcard._id });
    }
  };

  const handleResult = (isCorrect: boolean) => {
    const timeSeconds = (Date.now() - startTime) / 1000;
    onResult(isCorrect, timeSeconds);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ') { e.preventDefault(); handleFlip(); }
    if (isFlipped) {
      if (e.key === '1') handleResult(false); // Incorrect
      if (e.key === '2') handleResult(true);  // Correct
    }
  };

  return (
    <div className="w-full">
      <div 
        ref={cardRef}
        tabIndex={0} 
        onKeyDown={handleKeyDown}
        className="w-full aspect-[4/3] sm:aspect-video perspective-1000 focus:outline-none mb-6"
      >
        <motion.div 
          className="relative w-full h-full transition-transform duration-700 transform-style-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          onClick={handleFlip}
        >
          {/* Front of the card */}
          <div className="absolute w-full h-full backface-hidden bg-white rounded-lg shadow-xl flex items-center justify-center p-4 sm:p-6 text-center cursor-pointer">
            <div>
              <div className="prose max-w-none text-xl sm:text-2xl font-semibold text-gray-800" dangerouslySetInnerHTML={{ __html: flashcard.front }} />
              {flashcard.frontImage && (
                <div className="mt-4 flex justify-center"><Image src={flashcard.frontImage} alt="Front visual" className="max-h-40 sm:max-h-48 object-contain" width={400} height={400}/></div>
              )}
            </div>
          </div>

          {/* Back of the card */}
          <div className="absolute w-full h-full backface-hidden bg-blue-50 rounded-lg shadow-xl flex items-center justify-center p-4 sm:p-6 text-center rotate-y-180">
            <div>
              <div className="prose max-w-none text-xl sm:text-2xl font-semibold text-gray-800" dangerouslySetInnerHTML={{ __html: flashcard.back }} />
              {flashcard.backImage && (
                <div className="mt-4 flex justify-center"><Image src={flashcard.backImage} alt="Back visual" className="max-h-40 sm:max-h-48 object-contain" width={400} height={400}/></div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      
      {isFlipped && (
        <motion.div 
          className="flex flex-col sm:flex-row w-full gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button onClick={() => handleResult(false)} className="w-full py-3 px-6 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
            Incorrect (1)
          </button>
          <button onClick={() => handleResult(true)} className="w-full py-3 px-6 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
            Correct (2)
          </button>
        </motion.div>
      )}
    </div>
  );
}