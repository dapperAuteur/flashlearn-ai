/* eslint-disable @typescript-eslint/no-unused-vars */
import { notFound } from "next/navigation";
import Link from "next/link";
import dbConnect from "@/lib/db/mongodb";
import { FlashcardSet, IFlashcardSet } from "@/models/FlashcardSet";
import { isValidObjectId, Types } from "mongoose";
import PublicSetViewer from "@/components/PublicSetViewer";
import { flashcardSetSchema } from "@/lib/structured-data";
import { StudySession } from "@/models/StudySession";
import { ShareEventLogger } from "@/lib/share-event-logger";

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
        .select('title description isPublic cardCount')
        .lean<IFlashcardSet>();

    if (!set || !set.isPublic) {
        return { title: 'Set Not Found' };
    }

    const ogTitle = set.title;
    const description = set.description || `Study the ${set.cardCount ?? ''} card flashcard set: ${ogTitle}`;
    const ogImageUrl = `/api/og?type=set&title=${encodeURIComponent(ogTitle)}&description=${encodeURIComponent(description)}&cards=${set.cardCount ?? 0}`;

    return {
        title: `${ogTitle} | FlashLearnAI.WitUS.Online`,
        description,
        alternates: { canonical: `/sets/${setId}` },
        openGraph: {
            title: ogTitle,
            description,
            type: 'article',
            url: `/sets/${setId}`,
            images: [{ url: ogImageUrl, width: 1200, height: 630, alt: ogTitle }],
        },
        twitter: {
            card: 'summary_large_image',
            title: ogTitle,
            description,
            images: [ogImageUrl],
        },
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

  const structuredData = flashcardSetSchema({
    title: flashcardSet.title,
    description: flashcardSet.description || '',
    cardCount: flashcardSet.cardCount,
    url: `/sets/${setId}`,
  });

  // Study count for social proof (only show if ≥ 10)
  const studyCount = await StudySession.countDocuments({ listId: setId });
  const showStudyCount = studyCount >= 10;

  // Log this share link click (fire-and-forget)
  void ShareEventLogger.logClick('set', setId, 'direct', 'set');

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 md:p-8 mb-8 border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">{flashcardSet.title}</h1>
          {flashcardSet.description && (
            <p className="text-md text-gray-600 dark:text-gray-300 mb-4">{flashcardSet.description}</p>
          )}
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span>{flashcardSet.cardCount} Cards</span>
            {showStudyCount && (
              <>
                <span className="mx-2">·</span>
                <span>Studied {studyCount.toLocaleString()} times</span>
              </>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/study?setId=${setId}`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Study This Set
            </Link>
            <Link
              href={`/auth/signup?callbackUrl=${encodeURIComponent(`/versus/create?setId=${setId}`)}&utm_source=set_page&utm_medium=share&utm_campaign=set`}
              className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
            >
              ⚔️ Challenge a Friend
            </Link>
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
    </>
  );
}