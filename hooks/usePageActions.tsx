'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { Plus, Upload, Play, Download } from 'lucide-react';
import { PageActions } from '@/types/navigation';

export function usePageActions(): PageActions {
  const pathname = usePathname();

  return useMemo(() => {
    switch (pathname) {
      case '/dashboard':
        return {
          primary: {
            label: 'Create Flashcard',
            href: '/generate',
            icon: Plus,
            variant: 'primary',
            mobile: true,
            desktop: true,
          },
          secondary: [
            {
              label: 'Import',
              href: '/generate',
              icon: Upload,
              variant: 'secondary',
              mobile: false,
              desktop: true,
            },
            {
              label: 'Start Study',
              href: '/study',
              icon: Play,
              variant: 'secondary',
              mobile: true,
              desktop: true,
            },
          ],
        };

      case '/flashcards':
        return {
          primary: {
            label: 'Create',
            href: '/generate',
            icon: Plus,
            variant: 'primary',
            mobile: true,
            desktop: true,
          },
          secondary: [
            {
              label: 'Import',
              href: '/generate',
              icon: Upload,
              variant: 'secondary',
              mobile: false,
              desktop: true,
            },
            {
              label: 'Export',
              href: '/flashcards/export',
              icon: Download,
              variant: 'secondary',
              mobile: false,
              desktop: true,
            },
          ],
        };

      default:
        return {};
    }
  }, [pathname]);
}
