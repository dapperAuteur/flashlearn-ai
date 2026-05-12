import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import { getAllPressReleases, getPressReleaseBySlug, getReadingTime } from '@/lib/press';
import { pressReleaseSchema, BASE_URL } from '@/lib/structured-data';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const releases = getAllPressReleases();
  return releases.map(release => ({ slug: release.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const release = await getPressReleaseBySlug(slug);
  if (!release) return {};

  return {
    title: `${release.title} | FlashLearn AI Press`,
    description: release.excerpt,
    openGraph: {
      title: release.title,
      description: release.excerpt,
      type: 'article',
      url: `${BASE_URL}/press/${slug}`,
      publishedTime: release.date,
      authors: [release.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: release.title,
      description: release.excerpt,
    },
    alternates: {
      canonical: `${BASE_URL}/press/${slug}`,
    },
  };
}

export default async function PressReleasePage({ params }: Props) {
  const { slug } = await params;
  const release = await getPressReleaseBySlug(slug);

  if (!release) notFound();

  const readingTime = getReadingTime(release.content);

  return (
    <>
      <PublicHeader />
      <main id="main-content" className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link
            href="/press"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-8 min-h-[44px]"
            aria-label="Back to all press releases"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Press
          </Link>

          <header className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{release.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <time dateTime={release.date}>
                {new Date(release.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
              <span aria-hidden="true">&middot;</span>
              <span>{readingTime} min read</span>
              <span aria-hidden="true">&middot;</span>
              <span>{release.author}</span>
            </div>
          </header>

          <div
            className="max-w-none text-gray-900 leading-relaxed
              [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4
              [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3
              [&_p]:mb-4 [&_p]:text-gray-800
              [&_a]:text-blue-600 [&_a:hover]:underline [&_a]:break-words
              [&_strong]:font-semibold [&_strong]:text-gray-900
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1
              [&_li]:text-gray-800
              [&_hr]:my-8 [&_hr]:border-gray-200
              [&_table]:w-full [&_table]:my-6 [&_table]:border-collapse [&_table]:text-sm
              [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
              [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2
              [&_code]:bg-gray-100 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm
              [&_blockquote]:border-l-4 [&_blockquote]:border-blue-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-700 [&_blockquote]:my-4"
            dangerouslySetInnerHTML={{ __html: release.contentHtml }}
          />

          <nav className="mt-16 pt-8 border-t border-gray-200" aria-label="Press navigation">
            <Link
              href="/press"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium min-h-[44px]"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Press Releases
            </Link>
          </nav>
        </article>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(pressReleaseSchema({
              title: release.title,
              date: release.date,
              author: release.author,
              excerpt: release.excerpt,
              slug: release.slug,
            })),
          }}
        />
      </main>
    </>
  );
}
