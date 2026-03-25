/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import dbConnect from '@/lib/db/dbConnect';
import { HelpArticle, IHelpArticle } from '@/models/HelpArticle';
import { BASE_URL } from '@/lib/structured-data';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await dbConnect();

  const article = (await HelpArticle.findOne({
    slug,
    isPublished: true,
  }).lean()) as any | null;

  if (!article) return {};

  return {
    title: `${article.title} | Help Center | FlashLearn AI`,
    description: article.excerpt || `Learn about ${article.title} in the FlashLearn AI Help Center.`,
    openGraph: {
      title: `${article.title} | FlashLearn AI Help`,
      description: article.excerpt || `Help documentation for ${article.title}.`,
      type: 'article',
      url: `${BASE_URL}/help/${slug}`,
    },
    alternates: {
      canonical: `${BASE_URL}/help/${slug}`,
    },
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  'getting-started': 'Getting Started',
  'study-modes': 'Study Modes',
  versus: 'Versus',
  offline: 'Offline',
  api: 'API',
  teams: 'Teams',
  account: 'Account',
  billing: 'Billing',
};

export default async function HelpArticlePage({ params }: Props) {
  const { slug } = await params;
  await dbConnect();

  const article = (await HelpArticle.findOne({
    slug,
    isPublished: true,
  }).lean()) as (IHelpArticle & { _id: string }) | null;

  if (!article) notFound();

  // Fetch related articles (same category, different slug)
  const relatedArticles = (await HelpArticle.find({
    category: article.category,
    slug: { $ne: slug },
    isPublished: true,
  })
    .sort({ order: 1 })
    .limit(5)
    .select('title slug excerpt')
    .lean()) as any[];

  return (
    <>
      <PublicHeader />
      <main
        id="main-content"
        className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Back link */}
          <Link
            href="/help"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-8 min-h-[44px]"
            aria-label="Back to Help Center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Help Center
          </Link>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main content */}
            <article className="flex-1 min-w-0">
              <header className="mb-8">
                <span className="inline-block text-xs font-medium px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full mb-3">
                  {CATEGORY_LABELS[article.category] || article.category}
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                  {article.title}
                </h1>
                {article.excerpt && (
                  <p className="text-lg text-gray-600">{article.excerpt}</p>
                )}
              </header>

              <div
                className="prose prose-lg prose-blue max-w-none
                  prose-headings:text-gray-900 prose-p:text-gray-700
                  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                  prose-code:bg-gray-100 prose-code:rounded prose-code:px-1
                  prose-pre:bg-gray-900 prose-pre:text-gray-100
                  prose-img:rounded-lg"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-200">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Was this helpful? */}
              <div className="mt-10 p-6 bg-white rounded-xl border border-gray-200 text-center">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Was this article helpful?
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] text-sm font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                    aria-label="Yes, this article was helpful"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                      />
                    </svg>
                    Yes
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] text-sm font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    aria-label="No, this article was not helpful"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                      />
                    </svg>
                    No
                  </button>
                </div>
              </div>
            </article>

            {/* Related articles sidebar */}
            {relatedArticles.length > 0 && (
              <aside className="lg:w-72 flex-shrink-0" aria-label="Related articles">
                <div className="lg:sticky lg:top-8 bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                    Related Articles
                  </h2>
                  <nav aria-label="Related help articles">
                    <ul className="space-y-3">
                      {relatedArticles.map((related) => (
                        <li key={String(related._id)}>
                          <Link
                            href={`/help/${related.slug}`}
                            className="block min-h-[44px] py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
                          >
                            {related.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </aside>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
