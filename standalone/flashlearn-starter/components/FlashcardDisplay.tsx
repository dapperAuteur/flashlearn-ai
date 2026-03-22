'use client';

import { useState } from 'react';

interface FlashcardDisplayProps {
  front: string;
  back: string;
  onAnswer?: (isCorrect: boolean, confidenceRating: number, timeSeconds: number) => void;
  showControls?: boolean;
}

export default function FlashcardDisplay({ front, back, onAnswer, showControls = true }: FlashcardDisplayProps) {
  const [flipped, setFlipped] = useState(false);
  const [startTime] = useState(Date.now());

  const handleAnswer = (isCorrect: boolean, confidence: number) => {
    const timeSeconds = (Date.now() - startTime) / 1000;
    onAnswer?.(isCorrect, confidence, timeSeconds);
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Card */}
      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        className="w-full min-h-[200px] bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8 text-center cursor-pointer hover:shadow-xl transition-shadow"
        aria-label={flipped ? 'Showing answer. Click to see question.' : 'Showing question. Click to see answer.'}
      >
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
          {flipped ? 'Answer' : 'Question'}
        </p>
        <p className="text-xl font-medium text-gray-900">
          {flipped ? back : front}
        </p>
        {!flipped && (
          <p className="text-xs text-gray-400 mt-4">Tap to reveal answer</p>
        )}
      </button>

      {/* Answer controls */}
      {flipped && showControls && onAnswer && (
        <div className="mt-4 flex gap-2 justify-center" role="group" aria-label="Rate your answer">
          <button
            onClick={() => handleAnswer(false, 2)}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
          >
            Wrong
          </button>
          <button
            onClick={() => handleAnswer(true, 3)}
            className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200"
          >
            Hard
          </button>
          <button
            onClick={() => handleAnswer(true, 4)}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
          >
            Good
          </button>
          <button
            onClick={() => handleAnswer(true, 5)}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
          >
            Easy
          </button>
        </div>
      )}
    </div>
  );
}
