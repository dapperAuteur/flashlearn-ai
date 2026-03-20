import type { Metadata } from 'next';
import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';

export const metadata: Metadata = {
  title: {
    template: '%s | FlashLearn AI API Docs',
    default: 'API Documentation | FlashLearn AI',
  },
  description: 'Developer documentation for the FlashLearn AI Public API. Generate flashcards, run spaced repetition, and build competitive quizzes.',
  openGraph: {
    title: 'FlashLearn AI API Documentation',
    description: 'Build with the FlashLearn AI API. Free tier available.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

const docsNav = [
  { href: '/docs/api', label: 'Interactive Reference', description: 'Try endpoints live' },
  { href: '/docs/api/getting-started', label: 'Getting Started', description: 'Auth, first request, rate limits' },
  { href: '/docs/api/generation', label: 'Flashcard Generation', description: 'Generate, batch, CRUD sets' },
  { href: '/docs/api/spaced-repetition', label: 'Spaced Repetition', description: 'SM-2 study sessions' },
  { href: '/docs/api/versus-mode', label: 'Versus Mode', description: 'Competitive challenges' },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
            {/* Sidebar - hidden on mobile, shown on lg */}
            <nav
              className="hidden lg:block sticky top-8 self-start"
              aria-label="Documentation navigation"
            >
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                API Docs
              </h2>
              <ul className="space-y-1" role="list">
                {docsNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors"
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="block text-xs text-gray-400 mt-0.5">{item.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t">
                <Link
                  href="/developer"
                  className="block px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  Developer Portal
                </Link>
                <a
                  href="/api/v1/openapi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  OpenAPI Spec (JSON)
                </a>
              </div>
            </nav>

            {/* Mobile nav - horizontal scroll */}
            <nav
              className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto"
              aria-label="Documentation navigation"
            >
              <ul className="flex gap-2 min-w-max" role="list">
                {docsNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg whitespace-nowrap"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Main content */}
            <main id="main-content" role="main">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
