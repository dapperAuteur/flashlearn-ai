'use client';

import { useState } from "react";
import { IFlashcardSet } from "@/models/FlashcardSet";

// The props interface defines what data this component expects
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 perspective">
      {flashcardSet.flashcards
        .filter(card => card._id)
        .map((card, index) => (
          <div
            key={card._id!.toString()}
            className={`flashcard cursor-pointer h-48 rounded-lg shadow-md ${flippedCardIndices.has(index) ? 'flipped' : ''}`}
            onClick={() => toggleFlip(index)}
          >
            <div className="flashcard-inner relative w-full h-full text-center transition-transform duration-700 transform-style-preserve-3d">
              {/* Front Side */}
              <div className="flashcard-front absolute w-full h-full backface-hidden flex flex-col justify-center items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{card.front}</p>
              </div>
              {/* Back Side */}
              <div className="flashcard-back absolute w-full h-full backface-hidden flex flex-col justify-center items-center p-4 bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg transform rotate-y-180">
                <p className="text-md text-gray-800 dark:text-gray-200">{card.back}</p>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
