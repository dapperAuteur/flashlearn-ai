'use client';

import { useEffect, useState } from 'react';

/**
 * Which help articles are failing their readers.
 *
 * Sorted by the count of No answers, because the question this page exists to
 * answer is "what should I rewrite next", not "how are the docs doing overall".
 * An article nobody has answered is not a problem; an article twenty people
 * called unhelpful is.
 *
 * Comments do not appear here. They go to the Inbox and on to Triage, with the
 * rest of the feedback, so there is one queue to work rather than two.
 */

interface AdminArticle {
  _id: string;
  slug: string;
  title: string;
  category: string;
  isPublished: boolean;
  helpfulYes?: number;
  helpfulNo?: number;
}

export default function AdminHelpPage() {
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/help')
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => setArticles(data.articles ?? []))
      .catch(() => setError('Could not load the help articles.'))
      .finally(() => setIsLoading(false));
  }, []);

  const rated = articles.filter((a) => (a.helpfulYes ?? 0) + (a.helpfulNo ?? 0) > 0);
  const ranked = [...articles].sort((a, b) => {
    const noDiff = (b.helpfulNo ?? 0) - (a.helpfulNo ?? 0);
    if (noDiff !== 0) return noDiff;
    return (b.helpfulYes ?? 0) - (a.helpfulYes ?? 0);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Help article feedback</h1>
      <p className="mt-2 text-sm text-gray-700">
        Readers answer &quot;Was this article helpful?&quot; at the foot of every article,
        signed in or not. A No opens an optional comment box, and any comment goes to the
        Inbox with the rest of your feedback rather than showing up here.
      </p>

      {isLoading && <p className="mt-6 text-sm text-gray-700">Loading...</p>}
      {error && (
        <p role="status" className="mt-6 text-sm text-red-700">
          {error}
        </p>
      )}

      {!isLoading && !error && articles.length === 0 && (
        <p className="mt-6 text-sm text-gray-700">
          There are no help articles yet. Seed them from{' '}
          <a href="/admin/settings" className="text-blue-700 underline">
            Settings
          </a>
          .
        </p>
      )}

      {!isLoading && !error && articles.length > 0 && (
        <>
          <p className="mt-4 text-sm text-gray-700">
            {rated.length} of {articles.length} articles have been rated.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <caption className="sr-only">
                Help articles ordered by the number of readers who said the article did not
                help
              </caption>
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th scope="col" className="py-2 pr-4 font-semibold text-gray-900">
                    Article
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-gray-900">
                    Category
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-gray-900 text-right">
                    Helped
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-gray-900 text-right">
                    Did not help
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((article) => (
                  <tr key={article._id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">
                      <a
                        href={`/help/${article.slug}`}
                        className="text-blue-700 underline"
                      >
                        {article.title}
                      </a>
                      {!article.isPublished && (
                        <span className="ml-2 text-xs text-gray-600">(unpublished)</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{article.category}</td>
                    <td className="py-2 pr-4 text-right text-gray-900">
                      {article.helpfulYes ?? 0}
                    </td>
                    <td
                      className={`py-2 pr-4 text-right ${
                        (article.helpfulNo ?? 0) > 0 ? 'text-red-700 font-medium' : 'text-gray-900'
                      }`}
                    >
                      {article.helpfulNo ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
