/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { StudySession } from '@/models/StudySession';
import { CardResult } from '@/models/CardResult';
import { FlashcardSet } from '@/models/FlashcardSet';
import HistoricalSessionView from '@/components/study/HistoricalSessionView';
import { studyResultsSchema } from '@/lib/structured-data';

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

  const ogTitle = `${accuracy}% on ${setName}`;
  const description = `Study session results: ${session.correctCount}/${session.totalCards} correct on ${setName}`;
  const ogImageUrl = `/api/og?type=results&set=${encodeURIComponent(setName)}&accuracy=${accuracy}&correct=${session.correctCount}&total=${session.totalCards}`;

  return {
    title: `${ogTitle} | FlashLearn AI`,
    description,
    alternates: { canonical: `/results/${sessionId}` },
    openGraph: {
      title: ogTitle,
      description,
      type: 'article',
      url: `/results/${sessionId}`,
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

export default async function PublicResultsPage({ params }: ResultsPageProps) {
  const { sessionId } = await params;
  const { studySession, isOwner } = await findSession(sessionId);

  if (!studySession) {
    notFound();
  }

  const cardResults = await CardResult.find({ sessionId }).lean() as any[];

  let setName = studySession.setName || 'Flashcard Set';
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
        const content = { front: card.front, back: card.back };
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

  const findCardContent = (flashcardId: string) => {
    if (!flashcardId) return null;
    if (cardMap[flashcardId]) return cardMap[flashcardId];
    const asStr = String(flashcardId);
    if (cardMap[asStr]) return cardMap[asStr];
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

  const serializedCardResults = cardResults.map((cr: any) => {
    const content = findCardContent(cr.flashcardId);
    return {
      id: cr._id?.toString() || '',
      flashcardId: cr.flashcardId,
      isCorrect: cr.isCorrect,
      confidenceRating: cr.confidenceRating || null,
      front: content?.front || cr.front || '',
      back: content?.back || cr.back || '',
      timeSeconds: cr.timeSeconds || 0,
      studyMode: cr.studyMode || null,
      studyDirection: cr.studyDirection || null,
    };
  });

  // Compute per-mode breakdown from all CardResults for this set
  const modeBreakdown: { mode: string; direction: string; accuracy: number; attempts: number }[] = [];
  if (studySession.listId) {
    const allSetCardResults = await CardResult.find({
      setId: studySession.listId.toString(),
    }).lean() as any[];

    const modeMap = new Map<string, { correct: number; incorrect: number }>();
    for (const cr of allSetCardResults) {
      if (!cr.studyMode || !cr.studyDirection) continue;
      const key = `${cr.studyMode}:${cr.studyDirection}`;
      const existing = modeMap.get(key) ?? { correct: 0, incorrect: 0 };
      if (cr.isCorrect) existing.correct++; else existing.incorrect++;
      modeMap.set(key, existing);
    }
    for (const [key, data] of modeMap.entries()) {
      const [mode, direction] = key.split(':');
      const attempts = data.correct + data.incorrect;
      modeBreakdown.push({
        mode,
        direction,
        accuracy: attempts > 0 ? Math.round((data.correct / attempts) * 100) : 0,
        attempts,
      });
    }
  }

  const initialShareUrl = studySession.isShareable
    ? `${process.env.NEXTAUTH_URL}/results/${sessionId}`
    : null;

  const structuredData = studyResultsSchema({
    setName,
    accuracy,
    correct: studySession.correctCount,
    total: studySession.totalCards,
    url: `/results/${sessionId}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          {isOwner && (
            <div className="mb-4">
              <Link href="/history" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                ← Back to all results
              </Link>
            </div>
          )}
          <HistoricalSessionView
            sessionId={sessionId}
            setId={studySession.listId?.toString() || null}
            setName={setName}
            accuracy={accuracy}
            correctCount={studySession.correctCount}
            incorrectCount={studySession.incorrectCount}
            totalCards={studySession.totalCards}
            durationSeconds={durationSeconds}
            studyMode={studySession.studyMode || 'classic'}
            studyDirection={studySession.studyDirection || 'front-to-back'}
            isOwner={isOwner}
            isSetPublic={isSetPublic}
            modeBreakdown={modeBreakdown}
            cardResults={serializedCardResults}
            initialShareUrl={initialShareUrl}
          />
        </div>
      </div>
    </>
  );
}
