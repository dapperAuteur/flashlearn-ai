import Link from 'next/link';
import { UserGroupIcon, TrophyIcon } from '@heroicons/react/24/outline';

export interface PublicChallengeSummary {
  _id: string;
  challengeCode: string;
  setName: string;
  studyMode: string;
  studyDirection: string;
  cardCount: number;
  participantCount: number;
  completedCount: number;
  maxParticipants: number;
  topScore: number;
  winnerName: string | null;
  completedAt: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const modeLabel: Record<string, string> = {
  'multiple-choice': 'Multiple Choice',
  'classic': 'Classic',
};

export default function PublicChallengeCard({ challenge }: { challenge: PublicChallengeSummary }) {
  const {
    _id,
    challengeCode,
    setName,
    studyMode,
    cardCount,
    participantCount,
    completedCount,
    topScore,
    winnerName,
    completedAt,
  } = challenge;

  return (
    <article
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col"
      aria-label={`Challenge: ${setName}, top score ${topScore}`}
    >
      <div className="p-5 flex-1">
        {/* Title + code */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-gray-900 leading-snug line-clamp-2">
              {setName}
            </h2>
            <p className="text-xs text-gray-600 font-mono mt-0.5">{challengeCode}</p>
          </div>
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Completed
          </span>
        </div>

        {/* Meta */}
        <dl className="space-y-1.5 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <UserGroupIcon className="h-4 w-4 text-gray-600 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Players</dt>
            <dd>
              <span className="font-medium text-gray-800">{completedCount}</span>
              {participantCount > completedCount && (
                <span className="text-gray-600"> / {participantCount}</span>
              )}{' '}
              player{completedCount !== 1 ? 's' : ''}
            </dd>
          </div>

          {topScore > 0 && (
            <div className="flex items-center gap-1.5">
              <TrophyIcon className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
              <dt className="sr-only">Top score</dt>
              <dd>
                <span className="font-medium text-gray-800">{topScore}</span> top score
                {winnerName && (
                  <span className="text-gray-600"> · {winnerName}</span>
                )}
              </dd>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-600 pt-0.5">
            <span>{modeLabel[studyMode] ?? studyMode}</span>
            <span aria-hidden="true">·</span>
            <span>{cardCount} cards</span>
            {completedAt && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={completedAt}>{formatDate(completedAt)}</time>
              </>
            )}
          </div>
        </dl>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <Link
          href={`/versus/board/${_id}`}
          className="block w-full text-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
          aria-label={`View board for ${setName} challenge`}
        >
          View Board
        </Link>
      </div>
    </article>
  );
}
