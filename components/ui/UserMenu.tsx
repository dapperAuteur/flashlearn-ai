'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { User, LogOut, Settings, Shield } from 'lucide-react';


interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
}

export default function UserMenu({user}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const toggleMenu = () => setIsOpen(!isOpen);
  
  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // if (!user) {
  //   return null;
  // }
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="sr-only">Open user menu</span>
        {user.image ? (
          <Image
            className="h-8 w-8 rounded-full"
            src={user.image}
            alt={user.name || "User"}
            width={32}
            height={32}
            unoptimized
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
            {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
        )}
      </button>
      
      {isOpen && (
        <div role="menu" aria-label="User menu" className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1 px-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-sm font-medium text-gray-600">{user.email}</p>
          </div>
          <div className="py-1">
            {user.role === 'Admin' && (
              <Link
                href="/admin/dashboard"
                className="flex items-center px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 font-medium"
                onClick={() => setIsOpen(false)}
              >
                <Shield className="mr-2 h-4 w-4" aria-hidden="true" />
                Admin Dashboard
              </Link>
            )}
            <Link
              href="/profile"
              role="menuitem"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <User className="mr-2 h-4 w-4" aria-hidden="true" />
              Your Profile
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
              Settings
            </Link>
            <button
              role="menuitem"
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: '/' })
              }}
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}