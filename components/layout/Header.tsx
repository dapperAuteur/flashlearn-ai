// components/layout/Header.tsx
'use client';

import Link from 'next/link';
import UserMenu from '../ui/UserMenu';
import { Menu } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm h-16 fixed top-0 left-0 right-0 z-10">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Mobile menu button */}
        <button 
          className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
          onClick={toggleSidebar}
        >
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Logo - visible on mobile, hidden on desktop (shown in sidebar) */}
        <div className="md:hidden flex items-center">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">
            FlashLearn AI
          </Link>
        </div>
        
        {/* Right side navigation */}
        <div className="flex items-center space-x-4">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}