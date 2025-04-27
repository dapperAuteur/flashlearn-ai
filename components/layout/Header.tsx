// components/layout/Header.tsx
'use client';

import { useSession } from 'next-auth/react'
import Link from 'next/link';
import UserMenu from '../ui/UserMenu';
import { Menu } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const { data: session } = useSession();

  return (
    // Added dark mode background for context
    <header className="bg-white shadow-sm h-16 fixed top-0 left-0 right-0 z-10">
      <div className="h-full px-4 flex items-center justify-between">

        {/* --- Left Group --- */}
        {/* This div ensures there's always an element on the left */}
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" // Added dark mode styles
            onClick={toggleSidebar}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Optional: Placeholder for Desktop Logo/Brand if needed */}
          {/* <div className="hidden md:block"> ... Your Desktop Logo ... </div> */}
        </div>

        {/* --- Mobile Logo (Removed from main flow for simplicity) --- */}
        {/* If you need the logo centered on mobile, consider absolute positioning */}
        {/* Example:
           <div className="absolute left-1/2 transform -translate-x-1/2 md:hidden">
             <Link href="/dashboard" className="text-xl font-bold text-blue-600">
               FlashLearn AI
             </Link>
           </div>
        */}


        {/* --- Right Group --- */}
        {/* This div contains the UserMenu and will be pushed right */}
        <div className="flex items-center space-x-4">
          {session?.user ? ( // Check if user exists before rendering UserMenu
            <UserMenu user={session.user} />
          ) : (
            // Optional: Show Sign In button if not logged in
            <Link href="/signin" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
              Sign In
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
