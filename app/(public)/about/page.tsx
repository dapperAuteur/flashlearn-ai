import type { Metadata } from 'next';
import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import { organizationSchema, BASE_URL } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'About | FlashLearn AI',
  description: 'FlashLearn AI is an AI-powered flashcard platform by WitUS.Online, a B4C LLC property. Learn about our mission to make studying smarter.',
  openGraph: {
    title: 'About | FlashLearn AI',
    description: 'Learn about FlashLearn AI and our mission to make studying smarter with AI.',
    type: 'website',
    url: `${BASE_URL}/about`,
  },
  alternates: {
    canonical: `${BASE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <>
      <PublicHeader />
      <main id="main-content" className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">About FlashLearn AI</h1>

          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              FlashLearn AI exists to make studying faster, smarter, and more effective for everyone. We believe that
              creating study materials should take seconds, not hours &mdash; and that science-backed learning techniques
              like spaced repetition should be accessible to every student, teacher, and lifelong learner.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Our AI-powered platform generates flashcards from any content &mdash; text, PDFs, YouTube videos, audio,
              and images &mdash; then uses the SM-2 spaced repetition algorithm to help you remember what you learn.
              With multiplayer challenges, team collaboration, and offline support, learning fits into your life
              wherever you are.
            </p>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Who We Are</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              FlashLearn AI is a product of <strong>WitUS.Online</strong>, a digital education initiative by <strong>B4C LLC</strong>.
              We build tools that help people learn better and connect through knowledge.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">5+</p>
                <p className="text-sm text-gray-600 mt-1">Study Modes</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">23+</p>
                <p className="text-sm text-gray-600 mt-1">API Endpoints</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">6</p>
                <p className="text-sm text-gray-600 mt-1">Content Sources</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What Makes Us Different</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-blue-500 mt-1 flex-shrink-0" aria-hidden="true">&#10003;</span>
                <span><strong>AI-powered generation</strong> &mdash; create flashcards from text, PDFs, YouTube, audio, images, or CSV in seconds</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 mt-1 flex-shrink-0" aria-hidden="true">&#10003;</span>
                <span><strong>Science-backed retention</strong> &mdash; SM-2 spaced repetition ensures you remember what you study</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 mt-1 flex-shrink-0" aria-hidden="true">&#10003;</span>
                <span><strong>Multiplayer challenges</strong> &mdash; compete with friends in Versus mode with composite scoring</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 mt-1 flex-shrink-0" aria-hidden="true">&#10003;</span>
                <span><strong>Offline-first</strong> &mdash; study anywhere with automatic sync when you reconnect</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 mt-1 flex-shrink-0" aria-hidden="true">&#10003;</span>
                <span><strong>Public API</strong> &mdash; developers can build learning tools on top of our platform</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 mt-1 flex-shrink-0" aria-hidden="true">&#10003;</span>
                <span><strong>Teams &amp; classrooms</strong> &mdash; collaborate with study groups and classrooms</span>
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Have questions, feedback, or partnership inquiries? We&apos;d love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Contact Us
              </Link>
              <Link
                href="/roadmap"
                className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                View Roadmap
              </Link>
            </div>
          </section>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
        />
      </main>
    </>
  );
}
