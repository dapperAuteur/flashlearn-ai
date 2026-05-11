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
            className="prose prose-lg prose-blue max-w-none
              prose-headings:text-gray-900 prose-p:text-gray-700
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
              prose-code:bg-gray-100 prose-code:rounded prose-code:px-1
              prose-pre:bg-gray-900 prose-pre:text-gray-100
              prose-img:rounded-lg"
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
