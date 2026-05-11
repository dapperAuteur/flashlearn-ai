import Link from 'next/link';
import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import { getAllPressReleases, getReadingTime } from '@/lib/press';

export const metadata: Metadata = {
  title: 'Press | FlashLearn AI',
  description: 'Press releases from FlashLearnAI.WitUS.Online. Announcements, product launches, and company news.',
  openGraph: {
    title: 'Press | FlashLearn AI',
    description: 'Press releases from FlashLearnAI.WitUS.Online.',
    type: 'website',
    url: 'https://flashlearnai.witus.online/press',
  },
  alternates: {
    canonical: 'https://flashlearnai.witus.online/press',
  },
};

export default function PressPage() {
  const releases = getAllPressReleases();

  return (
    <>
      <PublicHeader />
      <main id="main-content" className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Press</h1>
          <p className="text-lg text-gray-600 mb-10">Press releases from FlashLearnAI.WitUS.Online</p>

          {releases.length === 0 ? (
            <p className="text-gray-500">No press releases yet. Check back soon.</p>
          ) : (
            <div className="space-y-8">
              {releases.map(release => (
                <article key={release.slug} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 hover:shadow-md transition-shadow">
                  <Link href={`/press/${release.slug}`} className="block group">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                      {release.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                      <time dateTime={release.date}>{new Date(release.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                      <span aria-hidden="true">&middot;</span>
                      <span>{getReadingTime(release.content)} min read</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{release.author}</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{release.excerpt}</p>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
