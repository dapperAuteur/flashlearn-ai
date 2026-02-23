/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import dbConnect from '@/lib/db/dbConnect';
import { StudySession } from '@/models/StudySession';
import { CardResult } from '@/models/CardResult';
import { FlashcardSet } from '@/models/FlashcardSet';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface ResultsPageProps {
  params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: ResultsPageProps) {
  const { sessionId } = await params;

  await dbConnect();
  const session = await StudySession.findOne({ sessionId, isShareable: true })
    .select('totalCards correctCount incorrectCount listId')
    .lean() as any;

  if (!session) {
    return { title: 'Results Not Found' };
  }

  const accuracy = session.totalCards > 0
    ? Math.round((session.correctCount / session.totalCards) * 100)
    : 0;

  let setName = 'Flashcard Set';
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

  await dbConnect();

  const studySession = await StudySession.findOne({ sessionId, isShareable: true }).lean() as any;
  if (!studySession) {
    notFound();
  }

  const cardResults = await CardResult.find({ sessionId }).lean() as any[];

  let setName = 'Flashcard Set';
  let isSetPublic = false;
  const cardMap: Record<string, { front: string; back: string }> = {};

  if (studySession.listId) {
    const flashcardSet = await FlashcardSet.findById(studySession.listId)
      .select('title isPublic flashcards')
      .lean() as any;

    if (flashcardSet) {
      setName = flashcardSet.title || setName;
      isSetPublic = flashcardSet.isPublic || false;
      for (const card of (flashcardSet.flashcards || [])) {
        cardMap[card._id.toString()] = { front: card.front, back: card.back };
      }
    }
  }

  const accuracy = studySession.totalCards > 0
    ? Math.round((studySession.correctCount / studySession.totalCards) * 100)
    : 0;

  const durationSeconds = studySession.endTime && studySession.startTime
    ? Math.round((new Date(studySession.endTime).getTime() - new Date(studySession.startTime).getTime()) / 1000)
    : 0;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

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
        {cardResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Card-by-Card Results</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {cardResults.map((cr: any, index: number) => {
                const cardInfo = cardMap[cr.flashcardId] || {};
                return (
                  <div key={cr._id?.toString() || index} className="p-4 flex items-start gap-3">
                    {cr.isCorrect ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {cardInfo.front || 'Card'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {cardInfo.back || ''}
                      </p>
                    </div>
                    {cr.confidenceRating && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        Confidence: {cr.confidenceRating}/5
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center space-y-4">
          {isSetPublic && studySession.listId && (
            <Link
              href={`/study?setId=${studySession.listId}`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Study This Set
            </Link>
          )}
          <div>
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Create your own flashcards with Flashlearn AI
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
