'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileSpreadsheet, 
  PieChart,
  Users,
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

export default function Sidebar({ isOpen, closeSidebar }: SidebarProps) {
  const pathname = usePathname();
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Flashcards', href: '/flashcards', icon: BookOpen },
    { name: 'Lists', href: '/lists', icon: FileSpreadsheet },
    { name: 'Statistics', href: '/statistics', icon: PieChart },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];
  
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-gray-600 bg-opacity-75 z-20"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`
          fixed top-0 bottom-0 left-0 z-30
          w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-0
        `}
      >
        {/* Sidebar header with logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">
            FlashLearn AI
          </Link>
          <button 
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
            onClick={closeSidebar}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Sidebar navigation */}
        <nav className="mt-6 px-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      closeSidebar();
                    }
                  }}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
        
        {/* Subscription info */}
        <div className="absolute bottom-0 w-full p-4 border-t">
          <div className="bg-blue-50 rounded-lg p-3">
            <h3 className="text-sm font-medium text-blue-800">Free Plan</h3>
            <p className="text-xs text-blue-600 mt-1">Upgrade to unlock all features</p>
            <Link
              href="/settings/subscription"
              className="mt-2 block text-center text-xs font-medium text-white bg-blue-600 py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}