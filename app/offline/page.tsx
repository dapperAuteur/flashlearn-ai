'use client';

import { WifiOff } from 'lucide-react';

// Both of these read from the local set copy, so they work with no
// connection once a device has synced at least once. Other precached pages
// (/dashboard, /history, /analytics, /explore, /versus) load their shell from
// the service worker but fetch every figure they show from the server, so they
// render empty offline and are deliberately not listed here.
const cachedRoutes = [
  { href: '/flashcards', label: 'My Flashcards' },
  { href: '/study', label: 'Study' },
];

export default function OfflinePage() {
  return (
    <main
      role="main"
      aria-label="Offline page"
      className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
    >
      <div className="text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-amber-100 rounded-full">
            <WifiOff className="h-10 w-10 text-amber-700" aria-hidden="true" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          You&apos;re Offline
        </h1>
        <p className="text-gray-700 mb-8">
          No internet connection. You can still study the sets already saved on
          this device. Your results are saved here and upload on their own once
          you are back online.
        </p>

        <nav aria-label="Available offline pages">
          <ul className="space-y-3">
            {cachedRoutes.map((route) => (
              <li key={route.href}>
                <a
                  href={route.href}
                  className="block w-full px-6 py-3 bg-white border border-gray-200 text-gray-900 font-medium rounded-xl hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                >
                  {route.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-sm text-gray-600 mt-8">
          Your dashboard, study history, and anything that generates or shares a
          set need a connection.
        </p>
      </div>
    </main>
  );
}
