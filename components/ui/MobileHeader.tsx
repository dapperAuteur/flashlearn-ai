'use client';

import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  onOpen: () => void;
}

/**
 * A simple header for mobile view that contains a menu button
 * to toggle the visibility of the sidebar.
 */
export default function MobileHeader({ onOpen }: MobileHeaderProps) {
  return (
    <div className="md:hidden border-b h-16 flex items-center px-4 bg-gray-900 text-white">
      <button
        onClick={onOpen}
        className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700"
        aria-label="Open sidebar"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="ml-4 font-bold">FlashLearn AI</div>
    </div>
  );
}
