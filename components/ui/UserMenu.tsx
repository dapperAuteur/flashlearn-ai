// components/ui/UserMenu.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { User, LogOut, Settings } from 'lucide-react';

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const toggleMenu = () => setIsOpen(!isOpen);
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={toggleMenu}
      >
        <span className="sr-only">Open user menu</span>
        {user.image ? (
          <img
            className="h-8 w-8 rounded-full"
            src={user.image}
            alt={user.name || "User"}
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
            {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
        )}
      </button>
      
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1 px-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-sm font-medium text-gray-500">{user.email}</p>
          </div>
          <div className="py-1">
            <Link
              href="/profile"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <User className="mr-2 h-4 w-4" />
              Your Profile
            </Link>
            <Link
              href="/settings"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
            <button
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: '/' });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}