import { Metadata } from 'next';
import Link from 'next/link';
import dbConnect from '@/lib/db/dbConnect';
import { Challenge } from '@/models/Challenge';
import PublicChallengeCard, { PublicChallengeSummary } from '@/components/versus/PublicChallengeCard';
import { challengeArchiveSchema, BASE_URL } from '@/lib/structured-data';

export const revalidate = 60;

const LIMIT = 12;

const SORT_OPTIONS = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'popular', label: 'Most Players' },
  { key: 'top-score', label: 'Top Score' },
] as const;
type SortKey = typeof SORT_OPTIONS[number]['key'];

const PERIOD_OPTIONS = [
  { key: 'all', label: 'All Time' },
  { key: 'month', label: 'This Month' },
  { key: 'week', label: 'This Week' },
] as const;
type PeriodKey = typeof PERIOD_OPTIONS[number]['key'];

interface ArchivePageProps {
  searchParams: Promise<{ sort?: string; period?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: ArchivePageProps): Promise<Metadata> {
  const { sort = 'recent', period = 'all' } = await searchParams;
  const periodLabel = PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? 'All Time';
  const sortLabel = SORT_OPTIONS.find((s) => s.key === sort)?.label ?? 'Most Recent';

  const title = 'Public Challenge Archive — FlashLearn AI';
  const description = `Browse completed multiplayer flashcard challenges. Sorted by ${sortLabel} · ${periodLabel}. See top scores, rankings, and compete against other learners.`;
  const url = '/versus/archive';

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}${url}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}${url}`,
      type: 'website',
      siteName: 'FlashLearn AI',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

async function getArchiveChallenges(sort: SortKey, period: PeriodKey, page: number) {
  await dbConnect();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = { scope: 'public', status: 'completed' };

  if (period === 'week') {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    filter.updatedAt = { $gte: since };
  } else if (period === 'month') {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    filter.updatedAt = { $gte: since };
  }

  const [challenges, total] = await Promise.all([
    Challenge.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * LIMIT)
      .limit(LIMIT)
      .select('challengeCode setName flashcardSetId studyMode studyDirection cardCount participants updatedAt createdAt maxParticipants scope')
      .lean(),
    Challenge.countDocuments(filter),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedUnsorted: PublicChallengeSummary[] = (challenges as any[]).map((ch) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completed = (ch.participants || []).filter((p: any) => p.status === 'completed');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topScore = completed.reduce((max: number, p: any) => Math.max(max, p.compositeScore ?? 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const winner = [...completed].sort((a: any, b: any) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))[0];

    return {
      _id: ch._id.toString(),
      challengeCode: ch.challengeCode,
      setName: ch.setName,
      studyMode: ch.studyMode,
      studyDirection: ch.studyDirection,
      cardCount: ch.cardCount,
      participantCount: (ch.participants || []).length,
      completedCount: completed.length,
      maxParticipants: ch.maxParticipants,
      topScore,
      winnerName: winner?.userName ?? null,
      completedAt: ch.updatedAt?.toISOString() ?? null,
    };
  });

  const enriched =
    sort === 'popular'
      ? [...enrichedUnsorted].sort((a, b) => b.participantCount - a.participantCount)
      : sort === 'top-score'
        ? [...enrichedUnsorted].sort((a, b) => b.topScore - a.topScore)
        : enrichedUnsorted;

  return { challenges: enriched, total, totalPages: Math.ceil(total / LIMIT) };
}

function buildUrl(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return `/versus/archive?${sp.toString()}`;
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const { sort = 'recent', period = 'all', page: pageStr = '1' } = await searchParams;
  const sortKey = (SORT_OPTIONS.find((s) => s.key === sort)?.key ?? 'recent') as SortKey;
  const periodKey = (PERIOD_OPTIONS.find((p) => p.key === period)?.key ?? 'all') as PeriodKey;
  const page = Math.max(1, parseInt(pageStr, 10));

  const { challenges, total, totalPages } = await getArchiveChallenges(sortKey, periodKey, page);

  const structuredData = challengeArchiveSchema({
    challenges,
    url: '/versus/archive',
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12" id="main-content">
        {/* Header */}
        <header className="mb-8">
          <nav aria-label="Breadcrumb" className="mb-4">
            <Link
              href="/versus/how-it-works"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              ← How It Works
            </Link>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Public Challenge Archive
          </h1>
          <p className="text-gray-600 max-w-xl">
            Browse completed multiplayer flashcard challenges. See rankings, top scores, and challenge yourself against other learners.
          </p>
          {total > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              <span className="font-medium text-gray-600">{total}</span> completed challenge{total !== 1 ? 's' : ''}
            </p>
          )}
        </header>

        {/* Filter row */}
        <div
          className="flex flex-wrap items-center gap-3 mb-6"
          role="toolbar"
          aria-label="Filter and sort challenges"
        >
          {/* Period filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1" role="group" aria-label="Time period">
            {PERIOD_OPTIONS.map((opt) => (
              <Link
                key={opt.key}
                href={buildUrl({ sort: sortKey, period: opt.key, page: '1' })}
                aria-current={periodKey === opt.key ? 'true' : undefined}
                aria-pressed={periodKey === opt.key}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  periodKey === opt.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          {/* Sort filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1" role="group" aria-label="Sort order">
            {SORT_OPTIONS.map((opt) => (
              <Link
                key={opt.key}
                href={buildUrl({ sort: opt.key, period: periodKey, page: '1' })}
                aria-current={sortKey === opt.key ? 'true' : undefined}
                aria-pressed={sortKey === opt.key}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  sortKey === opt.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Grid */}
        {challenges.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-2">No completed challenges yet</p>
            <p className="text-gray-400 text-sm mb-6">
              {period !== 'all'
                ? 'Try expanding the time range.'
                : 'Be the first to complete a public challenge!'}
            </p>
            <Link
              href="/versus/create"
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Create a Challenge
            </Link>
          </div>
        ) : (
          <>
            <ol
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Completed public challenges"
            >
              {challenges.map((ch) => (
                <li key={ch._id}>
                  <PublicChallengeCard challenge={ch} />
                </li>
              ))}
            </ol>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav
                className="mt-10 flex items-center justify-center gap-2"
                aria-label="Pagination"
              >
                {page > 1 && (
                  <Link
                    href={buildUrl({ sort: sortKey, period: periodKey, page: String(page - 1) })}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    aria-label="Previous page"
                  >
                    ← Previous
                  </Link>
                )}

                <span className="text-sm text-gray-500" aria-live="polite">
                  Page <span className="font-medium text-gray-800">{page}</span> of{' '}
                  <span className="font-medium text-gray-800">{totalPages}</span>
                </span>

                {page < totalPages && (
                  <Link
                    href={buildUrl({ sort: sortKey, period: periodKey, page: String(page + 1) })}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    aria-label="Next page"
                  >
                    Next →
                  </Link>
                )}
              </nav>
            )}
          </>
        )}

        {/* CTA footer */}
        <div className="mt-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-center text-white">
          <h2 className="text-xl font-bold mb-2">Ready to compete?</h2>
          <p className="text-blue-100 text-sm mb-5 max-w-md mx-auto">
            Create your own public challenge and see how you stack up against learners everywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/versus/create"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-lg bg-white text-blue-700 hover:bg-blue-50 transition-colors"
            >
              Create a Challenge
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-lg border border-blue-400 text-white hover:bg-blue-500 transition-colors"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
