// app/dashboard/flashcards/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Create New Flashcard</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <FlashcardForm onSubmit={handleCreateFlashcard} />
      </div>
    </DashboardLayout>
  );
}