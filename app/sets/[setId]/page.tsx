/* eslint-disable @typescript-eslint/no-unused-vars */
import { notFound } from "next/navigation";
import dbConnect from "@/lib/db/mongodb";
import { FlashcardSet, IFlashcardSet } from "@/models/FlashcardSet";
import { isValidObjectId, Types } from "mongoose";
import PublicSetViewer from "@/components/PublicSetViewer";

// FIXED: Updated interface for Next.js 15 - params is now a Promise
interface PublicSetPageProps {
  params: Promise<{
    setId: string;
  }>;
}

// Helper component for a single flashcard view
function FlashcardViewer({ front, back }: { front: string; back: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-4 h-40 flex items-center justify-center">
      <p className="text-center text-gray-800 dark:text-gray-200">{front}</p>
    </div>
  );
}

// FIXED: Updated metadata function to await params
export async function generateMetadata({ params }: { params: Promise<{ setId: string }> }) {
    // FIXED: Await the params Promise
    const { setId } = await params;
    
    await dbConnect;

    if (!isValidObjectId(setId)) {
        return { title: 'Set Not Found' };
    }

    // FIXED: Better TypeScript typing
    const set = await FlashcardSet.findById(setId)
        .select('title description isPublic')
        .lean<IFlashcardSet>();

    if (!set || !set.isPublic) {
        return { title: 'Set Not Found' };
    }

    return {
        title: `${set.title} | Flashlearn AI`,
        description: set.description || `Study the flashcard set: ${set.title}`,
    };
}

async function getPublicFlashcardSet(setId: string): Promise<IFlashcardSet | null> {
  if (!isValidObjectId(setId)) {
    console.warn(`Attempted to access a set with invalid ObjectId: ${setId}`);
    return null;
  }
  
  await dbConnect;
  
  // FIXED: Cleaner TypeScript approach
  const flashcardSet = await FlashcardSet.findOne({
    _id: setId,
    isPublic: true,
  }).lean() as IFlashcardSet | null;
  
  if (!flashcardSet) {
    return null;
  }
  
  // Ensure _id is a string for serialization if needed, though lean() helps
  return JSON.parse(JSON.stringify(flashcardSet));
}

// FIXED: Updated main component to await params
export default async function PublicSetPage({ params }: PublicSetPageProps) {
  // FIXED: Await the params Promise
  const { setId } = await params;
  
  const flashcardSet = await getPublicFlashcardSet(setId);

  if (!flashcardSet) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 md:p-8 mb-8 border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">{flashcardSet.title}</h1>
          {flashcardSet.description && (
            <p className="text-md text-gray-600 dark:text-gray-300 mb-4">{flashcardSet.description}</p>
          )}
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span>{flashcardSet.cardCount} Cards</span>
            <span className="mx-2">·</span>
            <span>Created by a user</span>
          </div>
        </div>

        <PublicSetViewer flashcardSet={flashcardSet} />

         <div className="text-center mt-12">
            <a 
                href="/generate" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105"
            >
                Create Your Own Flashcards with AI!
            </a>
        </div>
      </div>
    </div>
  );
}