'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, BookOpen, Sparkles, Swords, User } from 'lucide-react';

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/study', icon: BookOpen, label: 'Study' },
  { href: '/generate', icon: Sparkles, label: 'Generate' },
  { href: '/versus', icon: Swords, label: 'Versus' },
  { href: '/settings', icon: User, label: 'Profile' },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Only show for authenticated users on dashboard routes
  if (!session?.user) return null;

  // Hide on public pages, admin pages, and study session pages
  const hiddenPrefixes = ['/auth', '/admin', '/study/'];
  if (pathname === '/' || hiddenPrefixes.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 safe-area-pb"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`}
                aria-hidden="true"
              />
              <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
