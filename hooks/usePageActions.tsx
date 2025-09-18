'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { Plus, Upload, Play, Filter, Share, Settings, Download } from 'lucide-react';
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
            {
              label: 'Filter',
              onClick: () => {
                // TODO: Implement filter modal
                console.log('Filter clicked');
              },
              icon: Filter,
              variant: 'ghost',
              mobile: true,
              desktop: true,
            },
          ],
        };

      case '/lists':
        return {
          primary: {
            label: 'Create List',
            href: '/lists/new',
            icon: Plus,
            variant: 'primary',
            mobile: true,
            desktop: true,
          },
          secondary: [
            {
              label: 'Share',
              onClick: () => {
                // TODO: Implement share modal
                console.log('Share clicked');
              },
              icon: Share,
              variant: 'secondary',
              mobile: false,
              desktop: true,
            },
          ],
        };

      case '/study':
      case '/study':
        return {
          primary: {
            label: 'Start Session',
            onClick: () => {
              // TODO: Implement study session start
              console.log('Start session clicked');
            },
            icon: Play,
            variant: 'primary',
            mobile: true,
            desktop: true,
          },
          secondary: [
            {
              label: 'Select Deck',
              onClick: () => {
                // TODO: Implement deck selector
                console.log('Select deck clicked');
              },
              icon: Filter,
              variant: 'secondary',
              mobile: true,
              desktop: true,
            },
          ],
        };

      case '/settings':
      case '/profile':
        return {
          secondary: [
            {
              label: 'Save Changes',
              onClick: () => {
                // TODO: Implement save functionality
                console.log('Save changes clicked');
              },
              icon: Settings,
              variant: 'primary',
              mobile: true,
              desktop: true,
            },
          ],
        };

      default:
        return {};
    }
  }, [pathname]);
}