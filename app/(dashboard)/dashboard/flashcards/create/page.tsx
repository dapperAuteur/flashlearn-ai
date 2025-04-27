// app/dashboard/flashcards/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardForm from '@/components/flashcards/FlashcardForm';
import { FlashcardFormData } from '@/types/flashcard';

export default function CreateFlashcardPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleCreateFlashcard = async (data: FlashcardFormData) => {
    try {
      console.log('Creating flashcard with data:', data);
      
      // This will be replaced with actual API call in the next stages
      // const response = await fetch('/api/flashcards', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data),
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to create flashcard');
      // }

      // Simulate success for now
      setTimeout(() => {
        console.log('Flashcard created successfully');
        router.push('/dashboard/flashcards');
      }, 1000);
      
    } catch (error) {
      console.error('Error creating flashcard:', error);
      setError('Failed to create flashcard. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-100 min-h-screen">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      <FlashcardForm onSubmit={handleCreateFlashcard} />
    </div>
  );
}