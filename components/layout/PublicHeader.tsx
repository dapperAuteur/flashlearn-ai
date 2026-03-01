'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Shield } from 'lucide-react';

export default function PublicHeader() {
  const { data: session } = useSession();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-blue-600">
            FlashLearn AI
          </Link>

          <div className="flex items-center space-x-4">
            {session ? (
              <>
                {session.user?.role === 'Admin' && (
                  <Link
                    href="/admin/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/explore"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Explore
                </Link>
                <Link
                  href="/generate"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Generate
                </Link>
                <Link
                  href="/pricing"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Pricing
                </Link>
                <Link
                  href="/roadmap"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Roadmap
                </Link>
                <Link
                  href="/auth/signin"
                  className="px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}