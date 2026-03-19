import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import dbConnect from '@/lib/db/dbConnect';
import { Challenge } from '@/models/Challenge';
import { authOptions } from '@/lib/auth/auth';
import ChallengeBoard from '@/components/versus/ChallengeBoard';
import { isValidObjectId } from 'mongoose';

interface BoardPageProps {
  params: Promise<{ challengeId: string }>;
}

export async function generateMetadata({ params }: BoardPageProps): Promise<Metadata> {
  const { challengeId } = await params;
  if (!isValidObjectId(challengeId)) return { title: 'Challenge Board' };

  await dbConnect();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const challenge = await Challenge.findById(challengeId).select('setName scope participants status cardCount').lean() as any;

  if (!challenge) return { title: 'Challenge Board' };

  const completedCount = (challenge.participants ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.status === 'completed',
  ).length;
  const topScore = Math.max(
    0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(challenge.participants ?? []).map((p: any) => p.compositeScore ?? 0),
  );

  const title = `${challenge.setName} — Challenge Board`;
  const description = `${completedCount} player${completedCount !== 1 ? 's' : ''} competed · Top score: ${topScore} · ${challenge.cardCount} flashcards`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { challengeId } = await params;

  if (!isValidObjectId(challengeId)) notFound();

  await dbConnect();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const challenge = await Challenge.findById(challengeId).lean() as any;

  if (!challenge) notFound();

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id ?? null;

  // Access control for non-public challenges
  if (challenge.scope !== 'public') {
    if (!currentUserId) {
      redirect(`/login?callbackUrl=/versus/board/${challengeId}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isParticipant = challenge.participants?.some((p: any) => p.userId.toString() === currentUserId);
    if (!isParticipant) {
      return (
        <div className="max-w-md mx-auto mt-16 px-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="inline-flex items-center justify-center bg-gray-100 rounded-full p-3 mb-4">
              <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h1>
            <p className="text-sm text-gray-500 mb-6">
              This challenge board is only visible to participants. Join the challenge to view the rankings.
            </p>
            <Link
              href="/versus"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to Versus
            </Link>
          </div>
        </div>
      );
    }
  }

  // Sanitize participants (omit sessionId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participants = (challenge.participants ?? []).map((p: any) => ({
    userId: p.userId.toString(),
    userName: p.userName,
    status: p.status,
    compositeScore: p.compositeScore ?? null,
    scoreBreakdown: p.scoreBreakdown ?? null,
    rank: p.rank ?? null,
    completedAt: p.completedAt?.toISOString() ?? null,
  }));

  const boardChallenge = {
    _id: challenge._id.toString(),
    challengeCode: challenge.challengeCode,
    setName: challenge.setName,
    flashcardSetId: challenge.flashcardSetId.toString(),
    studyMode: challenge.studyMode,
    studyDirection: challenge.studyDirection,
    cardCount: challenge.cardCount,
    scope: challenge.scope,
    status: challenge.status,
    expiresAt: challenge.expiresAt?.toISOString() ?? '',
    maxParticipants: challenge.maxParticipants,
  };

  return (
    <main className="px-4 py-6 md:py-8" id="main-content">
      <div className="max-w-3xl mx-auto mb-4">
        <nav aria-label="Breadcrumb">
          <Link
            href="/versus"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to Versus
          </Link>
        </nav>
      </div>

      <ChallengeBoard
        challenge={boardChallenge}
        participants={participants}
        currentUserId={currentUserId}
      />
    </main>
  );
}
