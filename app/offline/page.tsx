'use client';

import { WifiOff } from 'lucide-react';

const cachedRoutes = [
  { href: '/flashcards', label: 'My Flashcards' },
  { href: '/study', label: 'Study' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/history', label: 'Study History' },
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
          No internet connection. You can still access your cached content below.
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
      </div>
    </main>
  );
}
