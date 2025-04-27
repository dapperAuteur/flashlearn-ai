// app/actions/flashcardActions.ts
'use server'; // Mark this file as containing Server Actions

import connectDB from '@/lib/db/mongodb';
import Flashcard from '@/lib/models/Flashcard';
import { FlashcardFormData } from '@/types/flashcard';
import { revalidatePath } from 'next/cache';
// import { getCurrentUser } from '@/lib/auth/session'; // Get user server-side

export async function createFlashcardAction(data: FlashcardFormData) {
  try {
    // const user = await getCurrentUser(); // Perform auth check server-side
    // if (!user) { throw new Error("Unauthorized"); }

    await connectDB();

    const newFlashcard = new Flashcard({
      front: data.front,
      back: data.back,
      listId: data.listId,
      tags: data.tags,
      // userId: user.id,
    });
    await newFlashcard.save();

    revalidatePath('/dashboard/flashcards'); // Clear cache for the list page
    return { success: true, flashcardId: newFlashcard._id.toString() };

  } catch (error) {
    console.error("Server Action Error creating flashcard:", error);
    const message = error instanceof Error ? error.message : "Failed to create flashcard";
    return { success: false, error: message };
  }
}
