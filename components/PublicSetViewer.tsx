'use client';

import { useState } from "react";
import { motion } from 'framer-motion';
import { 
  PlayIcon, 
  BookOpenIcon, 
  EyeIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { IFlashcardSet } from "@/models/FlashcardSet";

interface PublicSetViewerProps {
  flashcardSet: IFlashcardSet;
}

export default function PublicSetViewer({ flashcardSet }: PublicSetViewerProps) {
  const [flippedCardIndices, setFlippedCardIndices] = useState<Set<number>>(new Set());

  const toggleFlip = (index: number) => {
    setFlippedCardIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-8">
      {/* Action Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpenIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Ready to Study?</h3>
              <p className="text-sm text-gray-600">Start learning with this flashcard set</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Link
              href={`/study/${flashcardSet._id}`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <PlayIcon className="h-5 w-5 mr-2" />
              Study This Set
            </Link>
            
            <Link
              href="/study"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
            >
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Browse Public Sets
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Study Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{flashcardSet.cardCount}</div>
          <div className="text-sm text-gray-600">Cards</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">~{Math.ceil(flashcardSet.cardCount * 0.5)}m</div>
          <div className="text-sm text-gray-600">Est. Time</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{flashcardSet.source}</div>
          <div className="text-sm text-gray-600">Source</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">Public</div>
          <div className="text-sm text-gray-600">Visibility</div>
        </div>
      </div>

      {/* Flashcards Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Preview Cards
          </h3>
          <div className="flex items-center text-sm text-gray-500">
            <EyeIcon className="h-4 w-4 mr-1" />
            Click to flip
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {flashcardSet.flashcards
            .filter(card => card._id)
            .map((card, index) => {
              const isFlipped = flippedCardIndices.has(index);
              return (
                <motion.div
                  key={card._id!.toString()}
                  className="relative h-48 cursor-pointer"
                  onClick={() => toggleFlip(index)}
                  style={{ perspective: '1000px' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className={`relative w-full h-full transition-transform duration-500 transform-gpu preserve-3d ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                  >
                    {/* Front Side */}
                    <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-sm">
                      <div className="flex flex-col justify-center items-center p-6 h-full">
                        <div className="text-xs text-blue-600 font-medium mb-2 uppercase tracking-wide">
                          Question
                        </div>
                        <p className="text-sm font-medium text-blue-900 text-center line-clamp-4">
                          {card.front}
                        </p>
                      </div>
                    </div>
                    
                    {/* Back Side */}
                    <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg shadow-sm">
                      <div className="flex flex-col justify-center items-center p-6 h-full">
                        <div className="text-xs text-green-600 font-medium mb-2 uppercase tracking-wide">
                          Answer
                        </div>
                        <p className="text-sm text-green-900 text-center line-clamp-4">
                          {card.back}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* Call to Action */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl border shadow-sm p-8 text-center"
      >
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClockIcon className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Ready to Master These Cards?
          </h3>
          <p className="text-gray-600 mb-6">
            Start studying now with our AI-powered spaced repetition system to maximize your learning.
          </p>
          <Link
            href={`/study/${flashcardSet._id}`}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors font-medium text-lg shadow-lg"
          >
            <PlayIcon className="h-6 w-6 mr-3" />
            Start Studying Now
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// Add the CSS for card flipping
const style = document.createElement('style');
style.textContent = `
  .preserve-3d {
    transform-style: preserve-3d;
  }
  .backface-hidden {
    backface-visibility: hidden;
  }
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
`;
document.head.appendChild(style);