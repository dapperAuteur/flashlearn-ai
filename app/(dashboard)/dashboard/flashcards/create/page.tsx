// app/dashboard/flashcards/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FlashcardForm from '@/components/flashcards/FlashcardForm';
import { FlashcardFormData } from '@/types/flashcards';
// import { createFlashcard } from '@/app/api/flashcards/flashcardService'
import { Logger, LogContext } from "@/lib/logging/logger";
import { flashcardService } from '@/lib/api/flashcardClient';

export default function CreateFlashcardPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateFlashcard = async (data: FlashcardFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await Logger.info(
        LogContext.FLASHCARD,
        "User submitted create flashcard form",
        { metadata: { listId: data.listId } }
      );
      
      // const result = await createFlashcard(data);
      const startTime = performance.now();

      await Logger.info(
        LogContext.FLASHCARD,
        "Client initiating flashcard creation",
        { metadata: { listId: data.listId } }
      )

      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        await Logger.warning(
          LogContext.FLASHCARD,
          "Flashcard creation failed",
          { metadata: { error: responseData.error, status: response.status } }
        );
        throw new Error(responseData.error || 'Failed to create flashcard');
      }

      const duration = performance.now() - startTime;
          
      await Logger.info(
        LogContext.FLASHCARD,
        "Flashcard creation successful",
        { metadata: { id: responseData.id, durationMs: duration } }
      );


      // after flashcardService.ts

      // if (!result.success) {
      //   const errorMessage = result.error;
      //   await Logger.error(
      //     LogContext.FLASHCARD,
      //     `Flashcard creation error: ${errorMessage}`,
      //     { metadata: { listId: data.listId } }
      //   );
      //   return { success: false, error: errorMessage };
      // }
      
      await Logger.info(
        LogContext.FLASHCARD,
        "Redirecting user after successful flashcard creation",
        { metadata: { error } }
      );
      
      // Success - redirect to flashcards page
      router.push('/dashboard/flashcards');

      return {
      id: responseData.id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await Logger.error(
        LogContext.FLASHCARD,
        `Flashcard creation form error: ${errorMessage}`,
        { metadata: { error } }
      );
      
      setError(error instanceof Error ? error.message : 'Failed to create flashcard');
    } finally {
      setIsSubmitting(false);
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
        
        <FlashcardForm
          onSubmit={handleCreateFlashcard}
          isSubmitting={isSubmitting} />
      </div>
    </DashboardLayout>
  );
}