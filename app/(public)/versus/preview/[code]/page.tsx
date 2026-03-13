import { notFound } from 'next/navigation';
import Link from 'next/link';
import dbConnect from '@/lib/db/dbConnect';
import { Challenge, IChallenge } from '@/models/Challenge';
import { isValidObjectId } from 'mongoose';
import { versusEventSchema } from '@/lib/structured-data';
import { ShareEventLogger } from '@/lib/share-event-logger';

interface PreviewPageProps {
  params: Promise<{ code: string }>;
}

function formatTimeRemaining(expiresAt: Date): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export default async function ChallengePreviewPage({ params }: PreviewPageProps) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  await dbConnect();
  const challenge = await Challenge.findOne({ challengeCode: upperCode })
    .select('setName flashcardSetId cardCount maxParticipants participants status expiresAt studyMode studyDirection scope')
    .lean() as Pick<IChallenge, 'setName' | 'flashcardSetId' | 'cardCount' | 'maxParticipants' | 'participants' | 'status' | 'expiresAt' | 'studyMode' | 'studyDirection' | 'scope'> | null;

  if (!challenge || challenge.status === 'expired') {
    notFound();
  }

  // Log the share event (fire-and-forget)
  void ShareEventLogger.logClick('versus', upperCode, 'challenge_preview');

  const completedParticipants = challenge.participants
    .filter((p) => p.status === 'completed')
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  const signupUrl = `/auth/signup?callbackUrl=${encodeURIComponent(`/versus/join/${upperCode}`)}&utm_source=challenge_preview&utm_medium=share&utm_campaign=versus`;

  const structuredData = versusEventSchema({
    topic: challenge.setName,
    code: upperCode,
    maxParticipants: challenge.maxParticipants,
    url: `/versus/preview/${code}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Header badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
              ⚔️ You&apos;ve been challenged!
            </span>
          </div>

          {/* Challenge card */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{challenge.setName}</h1>
            <p className="text-sm text-gray-500 mb-4">
              {challenge.cardCount} cards ·{' '}
              {challenge.studyMode === 'multiple-choice' ? 'Multiple Choice' : 'Classic'} ·{' '}
              {challenge.studyDirection === 'front-to-back' ? 'Front→Back' : 'Back→Front'}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-4 mb-5 text-sm">
              <div className="flex flex-col items-center bg-blue-50 rounded-xl px-4 py-2 flex-1">
                <span className="font-bold text-xl text-blue-700">
                  {challenge.participants.length}/{challenge.maxParticipants}
                </span>
                <span className="text-gray-500 text-xs">Players</span>
              </div>
              <div className="flex flex-col items-center bg-orange-50 rounded-xl px-4 py-2 flex-1">
                <span className="font-bold text-xl text-orange-600">
                  {formatTimeRemaining(challenge.expiresAt)}
                </span>
                <span className="text-gray-500 text-xs">Remaining</span>
              </div>
            </div>

            {/* Leaderboard (if scores available) */}
            {completedParticipants.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current Standings</p>
                <div className="space-y-2">
                  {completedParticipants.map((p, i) => (
                    <div
                      key={String(p.userId)}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                        <span className="text-sm font-medium text-gray-800">{p.userName}</span>
                      </div>
                      {p.compositeScore !== undefined && (
                        <span className="text-sm font-bold text-blue-700">{p.compositeScore} pts</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Primary CTA */}
            <Link
              href={signupUrl}
              className="block w-full text-center px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all text-base mb-3"
            >
              Accept Challenge →
            </Link>

            {/* Secondary CTA */}
            {isValidObjectId(String(challenge.flashcardSetId)) && (
              <Link
                href={`/sets/${challenge.flashcardSetId}`}
                className="block w-full text-center px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Study the Set First
              </Link>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-blue-200">
            Already have an account?{' '}
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent(`/versus/join/${upperCode}`)}`}
              className="text-white font-medium underline"
            >
              Sign in to join
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
