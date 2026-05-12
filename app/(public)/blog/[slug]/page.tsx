import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import { getAllPosts, getPostBySlug, getReadingTime } from '@/lib/blog';
import { blogPostSchema, BASE_URL } from '@/lib/structured-data';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} | FlashLearn AI Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: `${BASE_URL}/blog/${slug}`,
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
    alternates: {
      canonical: `${BASE_URL}/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const readingTime = getReadingTime(post.content);

  return (
    <>
      <PublicHeader />
      <main id="main-content" className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-8 min-h-[44px]"
            aria-label="Back to all blog posts"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Blog
          </Link>

          <header className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
              <span aria-hidden="true">&middot;</span>
              <span>{readingTime} min read</span>
              <span aria-hidden="true">&middot;</span>
              <span>{post.author}</span>
            </div>
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
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
              [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4
              [&_code]:bg-gray-100 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm
              [&_pre_code]:bg-transparent [&_pre_code]:text-gray-100 [&_pre_code]:p-0
              [&_blockquote]:border-l-4 [&_blockquote]:border-blue-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-700 [&_blockquote]:my-4
              [&_img]:rounded-lg [&_img]:my-4"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          <nav className="mt-16 pt-8 border-t border-gray-200" aria-label="Blog navigation">
            <Link
              href="/blog"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium min-h-[44px]"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Posts
            </Link>
          </nav>
        </article>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(blogPostSchema({
              title: post.title,
              date: post.date,
              author: post.author,
              excerpt: post.excerpt,
              slug: post.slug,
            })),
          }}
        />
      </main>
    </>
  );
}
