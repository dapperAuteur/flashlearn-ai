'use client';

import { useState } from 'react';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';

interface JoinChallengeInputProps {
  onJoin: (code: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function JoinChallengeInput({ onJoin, isLoading, error }: JoinChallengeInputProps) {
  const [code, setCode] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();

    // Remove any accidental duplicate "VS-" prefixes
    value = value.replace(/^(VS-)+/, '');

    // Auto-prepend "VS-" for display
    if (value.length > 0) {
      setCode(`VS-${value}`);
    } else {
      setCode('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length > 0) {
      onJoin(trimmed);
    }
  };

  // Handle paste or direct typing with VS- prefix already present
  const handleRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();

    // If user types or pastes something that already starts with "VS-", use it directly
    if (raw.startsWith('VS-')) {
      setCode(raw);
    } else {
      handleChange(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={code}
          onChange={handleRawChange}
          placeholder='Enter code (e.g. VS-A3K9M2)'
          className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono tracking-wide"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || code.trim().length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowRightCircleIcon className="h-5 w-5" />
          {isLoading ? 'Joining...' : 'Join'}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </form>
  );
}
