import type { Metadata } from 'next';
import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import { BASE_URL } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Contact | FlashLearn AI',
  description: 'Get in touch with the FlashLearn AI team. Report bugs, request features, or ask questions.',
  openGraph: {
    title: 'Contact | FlashLearn AI',
    description: 'Get in touch with the FlashLearn AI team.',
    type: 'website',
    url: `${BASE_URL}/contact`,
  },
  alternates: {
    canonical: `${BASE_URL}/contact`,
  },
};

export default function ContactPage() {
  return (
    <>
      <PublicHeader />
      <main id="main-content" className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Contact Us</h1>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8">
            <p className="text-gray-700 leading-relaxed mb-6">
              We&apos;d love to hear from you. Whether you have a question about features, pricing,
              need a demo, or anything else, our team is ready to help.
            </p>

            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Report a Bug or Request a Feature</h2>
                <p className="text-gray-600 mb-3">
                  Signed-in users can submit feedback directly from the app using our built-in feedback system.
                  Navigate to your dashboard and use the feedback button to report issues or suggest features.
                </p>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In to Submit Feedback
                </Link>
              </div>

              <hr className="border-gray-200" />

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">General Inquiries</h2>
                <p className="text-gray-600">
                  For partnership opportunities, media inquiries, or general questions, reach out via our parent organization:
                </p>
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">WitUS.Online</p>
                  <p className="text-gray-600 text-sm">A B4C LLC Property</p>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">API &amp; Developer Support</h2>
                <p className="text-gray-600 mb-3">
                  For API-related questions, check our documentation first. If you need further help,
                  use the feedback system within your developer dashboard.
                </p>
                <Link
                  href="/docs/api"
                  className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View API Docs
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Helpful Links</h2>
            <nav aria-label="Helpful links">
              <ul className="space-y-3">
                <li>
                  <Link href="/help" className="text-blue-600 hover:text-blue-700 hover:underline min-h-[44px] inline-flex items-center">
                    Help Center
                  </Link>
                  <span className="text-gray-500"> &mdash; Browse FAQs and guides</span>
                </li>
                <li>
                  <Link href="/pricing" className="text-blue-600 hover:text-blue-700 hover:underline min-h-[44px] inline-flex items-center">
                    Pricing
                  </Link>
                  <span className="text-gray-500"> &mdash; View plans and features</span>
                </li>
                <li>
                  <Link href="/roadmap" className="text-blue-600 hover:text-blue-700 hover:underline min-h-[44px] inline-flex items-center">
                    Roadmap
                  </Link>
                  <span className="text-gray-500"> &mdash; See what&apos;s coming next</span>
                </li>
                <li>
                  <Link href="/blog" className="text-blue-600 hover:text-blue-700 hover:underline min-h-[44px] inline-flex items-center">
                    Blog
                  </Link>
                  <span className="text-gray-500"> &mdash; Tutorials and updates</span>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </main>
    </>
  );
}
