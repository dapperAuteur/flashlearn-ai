// components/layout/MainLayout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isLoading = status === 'loading';
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header/Navigation */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  FlashLearn AI
                </Link>
              </div>
              <nav className="ml-6 flex space-x-4">
                <Link 
                  href="#" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                    pathname === '/dashboard' 
                      ? 'border-blue-500 text-gray-900 dark:text-gray-100' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="#" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                    pathname === '/flashcards' 
                      ? 'border-blue-500 text-gray-900 dark:text-gray-100' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  My Flashcards
                </Link>
                <Link 
                  href="/generate" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                    pathname === '/generate' 
                      ? 'border-blue-500 text-gray-900 dark:text-gray-100' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Generate
                </Link>
                <Link 
                  href="#" 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 ${
                    pathname === '/study' 
                      ? 'border-blue-500 text-gray-900 dark:text-gray-100' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Study
                </Link>
              </nav>
            </div>
            <div className="flex items-center">
              {isLoading ? (
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
              ) : session ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="space-x-2">
                  <Link
                    href="/signin"
                    className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main>{children}</main>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} FlashLearn AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}