'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Shield, Menu, X } from 'lucide-react';

const publicLinks = [
  { label: 'Explore', href: '/explore' },
  { label: 'Generate', href: '/generate' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Developers', href: '/docs/api/getting-started' },
];

export default function PublicHeader() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-blue-600" aria-label="FlashLearn AI home">
            FlashLearn AI
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main navigation">
            {session ? (
              <>
                {session.user?.role === 'Admin' && (
                  <Link
                    href="/admin/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md"
                  >
                    <Shield className="h-4 w-4" aria-hidden="true" />
                    Admin
                  </Link>
                )}
                <Link
                  href="/docs/api/getting-started"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Developers
                </Link>
                <Link
                  href="/dashboard"
                  className="px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                {publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/auth/signin"
                  className="px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Sign In
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden border-t border-gray-200 bg-white"
          aria-label="Mobile navigation"
        >
          <div className="px-4 py-3 space-y-1">
            {session ? (
              <>
                {session.user?.role === 'Admin' && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md"
                  >
                    <Shield className="h-4 w-4" aria-hidden="true" />
                    Admin
                  </Link>
                )}
                <Link
                  href="/docs/api/getting-started"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Developers
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-md text-center"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                {publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/auth/signin"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-md text-center mt-2"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
