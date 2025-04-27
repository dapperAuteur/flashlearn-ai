// components/flashcards/FlashcardPreview.tsx
'use client';

import { useState } from 'react';

interface FlashcardPreviewProps {
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
}

export default function FlashcardPreview({ 
  front, 
  back, 
  frontImage, 
  backImage 
}: FlashcardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="w-full max-w-md h-64 mx-auto cursor-pointer perspective-1000" 
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front of card */}
        <div className="absolute w-full h-full backface-hidden bg-blue-100 border border-blue-200 rounded-lg p-4 flex flex-col justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Front</h3>
            <div className="whitespace-pre-wrap">{front || 'Front content will appear here'}</div>
            {frontImage && (
              <div className="mt-2">
                <img src={frontImage} alt="Front" className="max-h-32 mx-auto" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 text-center mt-4">Click to flip</div>
        </div>

        {/* Back of card */}
        <div className="absolute w-full h-full backface-hidden bg-green-100 border border-green-200 rounded-lg p-4 flex flex-col justify-center rotate-y-180">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Back</h3>
            <div className="whitespace-pre-wrap">{back || 'Back content will appear here'}</div>
            {backImage && (
              <div className="mt-2">
                <img src={backImage} alt="Back" className="max-h-32 mx-auto" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 text-center mt-4">Click to flip</div>
        </div>
      </div>
    </div>
  );
}