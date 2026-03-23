'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminNav = [
  { label: 'Branding', href: '/admin/branding' },
  { label: 'SEO', href: '/admin/seo' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Admin</h1>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">Back to app</Link>
      </div>

      <nav className="flex gap-1 border-b border-gray-200 mb-6" aria-label="Admin navigation">
        {adminNav.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
