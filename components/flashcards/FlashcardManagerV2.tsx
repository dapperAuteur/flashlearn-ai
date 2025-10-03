'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFlashcards } from '@/contexts/FlashcardContext';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function FlashcardManagerV2() {
  const { flashcardSets, createFlashcardSet } = useFlashcards();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = flashcardSets.filter(set =>
    set.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search sets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border rounded-md"
        />
      </div>

      {/* Create button */}
      <Link href="/generate" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md">
        <PlusIcon className="h-4 w-4 mr-2" />
        Create Set
      </Link>

      {/* Sets grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(set => (
          <div key={set.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="font-medium text-gray-900">{set.title}</h3>
            {set.description && <p className="text-sm text-gray-500 mt-1">{set.description}</p>}
            <div className="mt-4 text-sm text-gray-500">{set.card_count} cards</div>
            <Link href={`/study/${set.id}`} className="mt-4 block text-center px-3 py-2 bg-blue-600 text-white rounded-md">
              Study
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}