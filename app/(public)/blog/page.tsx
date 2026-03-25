import Link from 'next/link';
import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import { getAllPosts, getReadingTime } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog | FlashLearn AI',
  description: 'Tips, tutorials, and updates from FlashLearn AI. Learn how to study smarter with AI-powered flashcards.',
  openGraph: {
    title: 'Blog | FlashLearn AI',
    description: 'Tips, tutorials, and updates from FlashLearn AI.',
    type: 'website',
    url: 'https://flashlearnai.witus.online/blog',
  },
  alternates: {
    canonical: 'https://flashlearnai.witus.online/blog',
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <PublicHeader />
      <main id="main-content" className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Blog</h1>
          <p className="text-lg text-gray-600 mb-10">Tips, tutorials, and updates from FlashLearn AI</p>

          {posts.length === 0 ? (
            <p className="text-gray-500">No posts yet. Check back soon!</p>
          ) : (
            <div className="space-y-8">
              {posts.map(post => (
                <article key={post.slug} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 hover:shadow-md transition-shadow">
                  <Link href={`/blog/${post.slug}`} className="block group">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                      {post.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                      <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                      <span aria-hidden="true">&middot;</span>
                      <span>{getReadingTime(post.content)} min read</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{post.author}</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{post.excerpt}</p>
                  </Link>
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {post.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
