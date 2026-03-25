/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from 'next';
import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import dbConnect from '@/lib/db/dbConnect';
import { HelpArticle } from '@/models/HelpArticle';
import { BASE_URL } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Help Center | FlashLearn AI',
  description:
    'Find answers to your questions about FlashLearn AI. Browse help docs on getting started, study modes, versus challenges, offline mode, API, teams, account settings, and billing.',
  openGraph: {
    title: 'Help Center | FlashLearn AI',
    description:
      'Browse help documentation for FlashLearn AI -- study modes, versus challenges, offline support, API, teams, and more.',
    type: 'website',
    url: `${BASE_URL}/help`,
  },
  alternates: {
    canonical: `${BASE_URL}/help`,
  },
};

const CATEGORIES: {
  key: string;
  label: string;
  description: string;
}[] = [
  {
    key: 'getting-started',
    label: 'Getting Started',
    description: 'Set up your account and create your first flashcard set.',
  },
  {
    key: 'study-modes',
    label: 'Study Modes',
    description: 'Learn about flashcard, quiz, matching, and spaced repetition modes.',
  },
  {
    key: 'versus',
    label: 'Versus',
    description: 'Challenge friends and compete in real-time flashcard battles.',
  },
  {
    key: 'offline',
    label: 'Offline',
    description: 'Study anywhere without an internet connection.',
  },
  {
    key: 'api',
    label: 'API',
    description: 'Integrate FlashLearn AI into your own apps with our public API.',
  },
  {
    key: 'teams',
    label: 'Teams',
    description: 'Collaborate with study groups, classrooms, and organizations.',
  },
  {
    key: 'account',
    label: 'Account',
    description: 'Manage your profile, email, password, and preferences.',
  },
  {
    key: 'billing',
    label: 'Billing',
    description: 'Subscriptions, invoices, plan changes, and payment methods.',
  },
];

export default async function HelpCenterPage() {
  await dbConnect();

  const articles = (await HelpArticle.find({ isPublished: true })
    .sort({ category: 1, order: 1 })
    .lean()) as any[];

  // Group articles by category
  const grouped: Record<string, typeof articles> = {};
  for (const article of articles) {
    if (!grouped[article.category]) {
      grouped[article.category] = [];
    }
    grouped[article.category].push(article);
  }

  return (
    <>
      <PublicHeader />
      <main
        id="main-content"
        className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Help Center
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find answers to your questions about FlashLearn AI. Browse by
              category or search for a specific topic.
            </p>
          </div>

          {/* Category navigation -- scrollable on mobile, grid on desktop */}
          <nav
            aria-label="Help categories"
            className="flex overflow-x-auto gap-2 pb-2 mb-10 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:pb-0"
          >
            {CATEGORIES.map((cat) => {
              const count = grouped[cat.key]?.length ?? 0;
              return (
                <a
                  key={cat.key}
                  href={`#${cat.key}`}
                  className="flex-shrink-0 min-h-[44px] flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  {cat.label}
                  {count > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>

          {/* Articles by category */}
          <div className="space-y-12">
            {CATEGORIES.map((cat) => {
              const catArticles = grouped[cat.key] || [];
              return (
                <section key={cat.key} id={cat.key} aria-labelledby={`heading-${cat.key}`}>
                  <h2
                    id={`heading-${cat.key}`}
                    className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2"
                  >
                    {cat.label}
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">{cat.description}</p>

                  {catArticles.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                      No articles in this category yet.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {catArticles.map((article) => (
                        <Link
                          key={String(article._id)}
                          href={`/help/${article.slug}`}
                          className="group block min-h-[44px] bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all"
                        >
                          <h3 className="text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                            {article.title}
                          </h3>
                          {article.excerpt && (
                            <p className="text-sm text-gray-500 line-clamp-2">
                              {article.excerpt}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-16 text-center bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Can&apos;t find what you need?
            </h2>
            <p className="text-gray-600 mb-4">
              Reach out to our team and we&apos;ll get back to you as soon as possible.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
