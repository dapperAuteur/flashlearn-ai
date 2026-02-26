/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { StudySession } from '@/models/StudySession';
import { CardResult } from '@/models/CardResult';
import { FlashcardSet } from '@/models/FlashcardSet';
import CardResultRow from './CardResultRow';

interface ResultsPageProps {
  params: Promise<{ sessionId: string }>;
}

async function findSession(sessionId: string) {
  await dbConnect();

  // Check if user is authenticated and owns the session
  const authSession = await getServerSession(authOptions);
  const userId = authSession?.user?.id;

  // Owner can view their own results; otherwise require isShareable
  let studySession: any = null;
  if (userId) {
    studySession = await StudySession.findOne({ sessionId, userId }).lean();
  }
  if (!studySession) {
    studySession = await StudySession.findOne({ sessionId, isShareable: true }).lean();
  }

  return { studySession, isOwner: !!(userId && studySession && studySession.userId?.toString() === userId) };
}

export async function generateMetadata({ params }: ResultsPageProps) {
  const { sessionId } = await params;
  const { studySession: session } = await findSession(sessionId);

  if (!session) {
    return { title: 'Results Not Found' };
  }

  const accuracy = session.totalCards > 0
    ? Math.round((session.correctCount / session.totalCards) * 100)
    : 0;

  let setName = session.setName || 'Flashcard Set';
  if (session.listId) {
    const set = await FlashcardSet.findById(session.listId).select('title').lean() as any;
    if (set) setName = set.title;
  }

  return {
    title: `${accuracy}% on ${setName} | Flashlearn AI`,
    description: `Study session results: ${session.correctCount}/${session.totalCards} correct on ${setName}`,
    openGraph: {
      title: `${accuracy}% on ${setName}`,
      description: `${session.correctCount} out of ${session.totalCards} cards correct`,
    },
  };
}

export default async function PublicResultsPage({ params }: ResultsPageProps) {
  const { sessionId } = await params;
  const { studySession, isOwner } = await findSession(sessionId);

  if (!studySession) {
    notFound();
  }

  const cardResults = await CardResult.find({ sessionId }).lean() as any[];

  let setName = studySession.setName || 'Flashcard Set';
  let isSetPublic = false;
  // Build card content map using multiple key formats for robust matching
  const cardMap: Record<string, { front: string; back: string }> = {};

  if (studySession.listId) {
    const flashcardSet = await FlashcardSet.findById(studySession.listId)
      .select('title isPublic flashcards')
      .lean() as any;

    if (flashcardSet) {
      setName = flashcardSet.title || setName;
      isSetPublic = flashcardSet.isPublic || false;
      for (const card of (flashcardSet.flashcards || [])) {
        const content = { front: card.front, back: card.back };
        // Add multiple key formats to handle ObjectId/string mismatches
        const idStr = String(card._id);
        cardMap[idStr] = content;
        if (card._id?.toHexString) {
          cardMap[card._id.toHexString()] = content;
        }
        if (card._id?.toString && card._id.toString() !== idStr) {
          cardMap[card._id.toString()] = content;
        }
      }
    }
  }

  // Helper to find card content with fallback matching
  const findCardContent = (flashcardId: string) => {
    if (!flashcardId) return null;
    // Direct lookup
    if (cardMap[flashcardId]) return cardMap[flashcardId];
    // Try String() conversion
    const asStr = String(flashcardId);
    if (cardMap[asStr]) return cardMap[asStr];
    // Try trimmed
    const trimmed = asStr.trim();
    if (cardMap[trimmed]) return cardMap[trimmed];
    return null;
  };

  const accuracy = studySession.totalCards > 0
    ? Math.round((studySession.correctCount / studySession.totalCards) * 100)
    : 0;

  const durationSeconds = studySession.endTime && studySession.startTime
    ? Math.round((new Date(studySession.endTime).getTime() - new Date(studySession.startTime).getTime()) / 1000)
    : 0;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  // Serialize card results for client component
  // Priority: FlashcardSet lookup > CardResult stored content > empty
  const serializedCardResults = cardResults.map((cr: any) => {
    const content = findCardContent(cr.flashcardId);
    return {
      id: cr._id?.toString() || '',
      flashcardId: cr.flashcardId,
      isCorrect: cr.isCorrect,
      confidenceRating: cr.confidenceRating || null,
      front: content?.front || cr.front || '',
      back: content?.back || cr.back || '',
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Session Results</h1>
          <p className="text-gray-600">{setName}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{accuracy}%</p>
            <p className="text-sm text-gray-500">Accuracy</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{studySession.correctCount}</p>
            <p className="text-sm text-gray-500">Correct</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{studySession.incorrectCount}</p>
            <p className="text-sm text-gray-500">Incorrect</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-gray-700">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
            <p className="text-sm text-gray-500">Duration</p>
          </div>
        </div>

        {/* Per-Card Results */}
        {serializedCardResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Card-by-Card Results</h2>
              <p className="text-xs text-gray-500 mt-0.5">Tap a card to review it</p>
            </div>
            <div className="divide-y divide-gray-100">
              {serializedCardResults.map((cr, index) => (
                <CardResultRow key={cr.id || index} card={cr} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center space-y-4">
          {(isSetPublic || isOwner) && studySession.listId && (
            <Link
              href={`/study?setId=${studySession.listId}`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Study This Set Again
            </Link>
          )}
          {isOwner && (
            <div>
              <Link
                href="/dashboard"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Back to Dashboard
              </Link>
            </div>
          )}
          {!isOwner && (
            <div>
              <Link
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Create your own flashcards with Flashlearn AI
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
