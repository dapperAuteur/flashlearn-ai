'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  articleSlug: string;
  label?: string;
}

export default function HelpTooltip({ articleSlug, label = 'Learn more' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-5 h-5 text-gray-400 hover:text-blue-500 transition-colors"
        aria-label={`Help: ${label}`}
        aria-expanded={isOpen}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50"
          role="tooltip"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-gray-600">{label}</p>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-500 flex-shrink-0"
              aria-label="Close tooltip"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
          <Link
            href={`/help/${articleSlug}`}
            className="mt-2 text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            onClick={() => setIsOpen(false)}
          >
            Read full article
            <span aria-hidden="true">&rarr;</span>
          </Link>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45" />
          </div>
        </div>
      )}
    </span>
  );
}
