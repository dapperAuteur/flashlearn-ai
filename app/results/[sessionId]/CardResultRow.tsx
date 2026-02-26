'use client';

import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface CardResultRowProps {
  card: {
    id: string;
    flashcardId: string;
    isCorrect: boolean;
    confidenceRating: number | null;
    front: string;
    back: string;
  };
  index: number;
}

export default function CardResultRow({ card, index }: CardResultRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = card.front.length > 0;
  const displayFront = hasContent ? card.front : `Card ${index + 1}`;

  return (
    <div
      className={`${hasContent ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
      onClick={() => hasContent && setExpanded(!expanded)}
    >
      <div className="p-4 flex items-start gap-3">
        {card.isCorrect ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
        ) : (
          <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium text-gray-900 ${expanded ? '' : 'truncate'}`}>
            {displayFront}
          </p>
          {!expanded && hasContent && (
            <p className="text-sm text-gray-500 truncate">
              {card.back}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {card.confidenceRating && (
            <span className="text-xs text-gray-500">
              {card.confidenceRating}/5
            </span>
          )}
          {hasContent && (
            <ChevronDownIcon
              className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      </div>

      {expanded && hasContent && (
        <div className="px-4 pb-4 ml-8">
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Front</p>
              <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{card.front}</p>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Back</p>
              <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{card.back}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
