import Link from 'next/link';

const footerLinks = {
  Product: [
    { label: 'Explore Sets', href: '/explore' },
    { label: 'AI Generator', href: '/generate' },
    { label: 'Versus Mode', href: '/versus/how-it-works' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Roadmap', href: '/roadmap' },
  ],
  Developers: [
    { label: 'API Docs', href: '/docs/api/getting-started' },
    { label: 'Interactive Reference', href: '/docs/api' },
    { label: 'Generation Guide', href: '/docs/api/generation' },
    { label: 'Spaced Repetition Guide', href: '/docs/api/spaced-repetition' },
    { label: 'Versus Mode Guide', href: '/docs/api/versus-mode' },
    { label: 'Developer Portal', href: '/developer' },
  ],
  Company: [
    { label: 'Sign Up', href: '/auth/signup' },
    { label: 'Sign In', href: '/auth/signin' },
  ],
};

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300" role="contentinfo" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="text-xl font-bold text-white" aria-label="FlashLearn AI home">
              FlashLearn AI
            </Link>
            <p className="mt-3 text-sm text-gray-400 max-w-xs">
              AI-powered flashcard generation, spaced repetition, and competitive learning — for students, teachers, and developers.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                {category}
              </h3>
              <ul className="space-y-2.5" role="list">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-gray-500">
            &copy; {year} FlashLearn AI. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a
              href="/api/v1/openapi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              OpenAPI Spec
            </a>
            <Link href="/docs/api" className="text-xs text-gray-500 hover:text-gray-300">
              API Reference
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
