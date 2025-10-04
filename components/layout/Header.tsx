'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { usePageActions } from '@/hooks/usePageActions';
import UserMenu from '@/components/ui/UserMenu';
import { NavigationItem } from '@/types/navigation';

const primaryNavigation: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Flashcards', href: '/flashcards' },
  { label: 'Study', href: '/study' },
  { label: 'Settings', href: '/settings' },
];

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const pageActions = usePageActions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActivePath = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-blue-600">
              FlashLearn AI
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {primaryNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActivePath(item.href)
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Context Actions */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
            {/* Secondary Actions */}
            {pageActions.secondary?.map((action, index) => {
              if (!action.desktop) return null;
              
              const baseClassName = `inline-flex items-center px-2 lg:px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                action.variant === 'primary'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : action.variant === 'secondary'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`;
              
              return action.href ? (
                <Link
                  key={index}
                  href={action.href}
                  className={baseClassName}
                >
                  {action.icon && <action.icon className="w-4 h-4 lg:mr-2" />}
                  <span className="hidden lg:inline">{action.label}</span>
                </Link>
              ) : (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={baseClassName}
                >
                  {action.icon && <action.icon className="w-4 h-4 lg:mr-2" />}
                  <span className="hidden lg:inline">{action.label}</span>
                </button>
              );
            })}

            {/* Primary Action */}
            {pageActions.primary && pageActions.primary.desktop && (
              <>
                {pageActions.primary.href ? (
                  <Link
                    href={pageActions.primary.href}
                    className="inline-flex items-center px-3 lg:px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    {pageActions.primary.icon && <pageActions.primary.icon className="w-4 h-4 lg:mr-2" />}
                    <span className="hidden lg:inline">{pageActions.primary.label}</span>
                  </Link>
                ) : (
                  <button
                    onClick={pageActions.primary.onClick}
                    className="inline-flex items-center px-3 lg:px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    {pageActions.primary.icon && <pageActions.primary.icon className="w-4 h-4 lg:mr-2" />}
                    <span className="hidden lg:inline">{pageActions.primary.label}</span>
                  </button>
                )}
              </>
            )}

            {/* User Menu */}
            {session?.user && <UserMenu user={session.user} />}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            {session?.user && <UserMenu user={session.user} />}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              {primaryNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block pl-3 pr-4 py-2 text-base font-medium transition-colors ${
                    isActivePath(item.href)
                      ? 'bg-blue-50 border-r-4 border-blue-500 text-blue-700'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Mobile Context Actions */}
            {(pageActions.primary?.mobile || pageActions.secondary?.some(action => action.mobile)) && (
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="space-y-1">
                  {pageActions.primary?.mobile && (
                    <>
                      {pageActions.primary.href ? (
                        <Link
                          href={pageActions.primary.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block px-4 py-2 text-base font-medium text-blue-600"
                        >
                          {pageActions.primary.label}
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            pageActions.primary?.onClick?.();
                            setIsMobileMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-base font-medium text-blue-600"
                        >
                          {pageActions.primary.label}
                        </button>
                      )}
                    </>
                  )}
                  
                  {pageActions.secondary?.filter(action => action.mobile).map((action, index) => (
                    <div key={index}>
                      {action.href ? (
                        <Link
                          href={action.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block px-4 py-2 text-base font-medium text-gray-500"
                        >
                          {action.label}
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            action.onClick?.();
                            setIsMobileMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500"
                        >
                          {action.label}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}