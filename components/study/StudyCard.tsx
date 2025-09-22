'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { Flashcard } from '@/types/flashcard';
import ConfidenceScale from './ConfidenceScale';
import { 
  HandThumbUpIcon, 
  HandThumbDownIcon, 
  CursorArrowRaysIcon,
  CommandLineIcon,
  LockClosedIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface StudyCardProps {
  flashcard: Flashcard;
  isFlipped: boolean;
  canFlip: boolean;
  onFlip: () => void;
  onResult: (isCorrect: boolean, timeSeconds: number) => void;
  onConfidenceSelect: (rating: number) => void;
  onPrevious: () => void;
  onEndSession: () => void;
  isConfidenceRequired: boolean;
  hasCompletedConfidence: boolean;
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
  const [isHovered, setIsHovered] = useState(false);
  const cardId = String(flashcard._id);

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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Instructions Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              {canFlip ? (
                <CursorArrowRaysIcon className="h-5 w-5 text-blue-600" />
              ) : (
                <LockClosedIcon className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {!canFlip ? 'Rate your confidence first' : 'Click card to reveal answer'}
              </p>
              <p className="text-sm text-gray-600">
                {!canFlip ? 'Choose how confident you feel about this card' : 'Then mark if you got it right or wrong'}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            <CommandLineIcon className="h-4 w-4" />
            <span>Space • ← → • ↑ • Esc</span>
          </div>
        </div>
      </div>

      {/* Confidence Rating */}
      <AnimatePresence>
        {isConfidenceRequired && !isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ConfidenceScale 
              onRatingSelect={onConfidenceSelect}
              disabled={!isConfidenceRequired}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Flashcard */}
      <motion.div
        className="relative perspective-1000"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <motion.div
          className={`w-full h-96 relative ${
            canFlip ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-not-allowed'
          }`}
          onClick={handleFlip}
          animate={{ 
            scale: isHovered && canFlip ? 1.02 : 1
          }}
          transition={{ 
            duration: 0.3,
            type: "spring",
            stiffness: 100
          }}
          style={{ 
            transformStyle: "preserve-3d",
            filter: canFlip ? 'none' : 'grayscale(0.3)'
          }}
        >
          {/* Front of card */}
          <motion.div 
            className="absolute w-full h-full"
            animate={{ rotateY: isFlipped ? -180 : 0 }}
            transition={{ duration: 0.6 }}
            style={{ 
              backfaceVisibility: "hidden",
              transformStyle: "preserve-3d"
            }}
          >
            <div className="w-full h-full bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl p-8 flex flex-col justify-center relative overflow-hidden">
              {/* Glassmorphism background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-200/30 to-pink-200/30 rounded-full blur-2xl" />
              
              <div className="relative z-10 overflow-auto">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 bg-blue-100/50 backdrop-blur-sm text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                    <span>Question</span>
                  </div>
                </div>
                <div 
                  className="text-center text-xl prose prose-slate max-w-none leading-relaxed text-gray-800"
                  dangerouslySetInnerHTML={{ __html: flashcard.front }}
                />
                {flashcard.frontImage && (
                  <div className="mt-6 flex justify-center">
                    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                      <Image 
                        src={flashcard.frontImage} 
                        alt="Front visual" 
                        className="max-h-48 object-contain rounded-lg" 
                        width={400} 
                        height={400} 
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Flip indicator */}
              {canFlip && (
                <div className="absolute bottom-4 right-4 bg-white/70 backdrop-blur-sm text-gray-600 px-3 py-2 rounded-lg text-sm font-medium opacity-60">
                  Click to flip
                </div>
              )}
            </div>
          </motion.div>

          {/* Back of card */}
          <motion.div 
            className="absolute w-full h-full"
            animate={{ rotateY: isFlipped ? 0 : 180 }}
            transition={{ duration: 0.6 }}
            style={{ 
              backfaceVisibility: "hidden",
              transformStyle: "preserve-3d",
              opacity: isFlipped ? 1 : 0
            }}
          >
            <div className="w-full h-full bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl p-8 flex flex-col justify-center relative overflow-hidden">
              {/* Glassmorphism background elements */}
              <div className="absolute top-0 left-0 w-28 h-28 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tr from-teal-200/30 to-cyan-200/30 rounded-full blur-2xl" />
              
              <div className="relative z-10 overflow-auto">
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 bg-green-100/50 backdrop-blur-sm text-green-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Answer</span>
                  </div>
                </div>
                <div 
                  className="text-center text-xl prose prose-slate max-w-none leading-relaxed text-gray-800"
                  dangerouslySetInnerHTML={{ __html: flashcard.back }}
                />
                {flashcard.backImage && (
                  <div className="mt-6 flex justify-center">
                    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                      <Image 
                        src={flashcard.backImage} 
                        alt="Back visual" 
                        className="max-h-48 object-contain rounded-lg" 
                        width={400} 
                        height={400} 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Answer Buttons */}
      <AnimatePresence>
        {isFlipped && hasCompletedConfidence && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6 shadow-lg">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">How did you do?</h3>
                <p className="text-gray-600">Be honest with yourself for better learning</p>
              </div>
              
              <div className="flex space-x-4 justify-center">
                <motion.button 
                  onClick={() => handleResult(false)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-lg transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <HandThumbDownIcon className="h-5 w-5 mr-2" />
                  Got it Wrong
                </motion.button>
                
                <motion.button 
                  onClick={() => handleResult(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-lg transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <HandThumbUpIcon className="h-5 w-5 mr-2" />
                  Got it Right
                </motion.button>
              </div>
              
              {/* Keyboard shortcuts reminder */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Quick keys: <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">←</kbd> Wrong • <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">→</kbd> Right
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}