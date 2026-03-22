'use client';

import { useState } from 'react';
import Link from 'next/link';
import { branding, isFeatureEnabled } from '@/lib/branding';
import { Menu, X } from 'lucide-react';

const allNavItems = [
  { label: 'Generate', href: '/generate', feature: 'generate' as const },
  { label: 'My Sets', href: '/sets', feature: 'sets' as const },
  { label: 'Explore', href: '/explore', feature: 'explore' as const },
  { label: 'Study', href: '/study', feature: 'study' as const },
  { label: 'Versus', href: '/versus', feature: 'versus' as const },
  { label: 'Usage', href: '/usage', feature: 'usage' as const },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navItems = allNavItems.filter(item => isFeatureEnabled(item.feature));

  return (
    <header className="bg-white shadow-sm border-b" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <Link href="/" className="flex items-center gap-2" aria-label={`${branding.appName} home`}>
            {branding.logoUrl && (
              <img src={branding.logoUrl} alt="" className="h-8 w-8 rounded" aria-hidden="true" />
            )}
            <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
              {branding.appName}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navItems.map(item => (
              <Link key={item.href} href={item.href}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                {item.label}
              </Link>
            ))}
          </nav>

          <button type="button" className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded"
            onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}>
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="md:hidden border-t bg-white px-4 py-2" aria-label="Mobile navigation">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
