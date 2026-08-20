/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { AuthProvider } from '@/components/providers/AuthProvider';
import PublicHeader from '@/components/layout/PublicHeader';
import { usePathname } from 'next/navigation';
import { StudySessionProvider } from '@/contexts/StudySessionContext';
import { Analytics } from "@vercel/analytics/next"
import { FlashcardProvider } from '@/contexts/FlashcardContext';
import { NetworkSyncProvider } from '@/contexts/NetworkSyncContext';
import { PowerSyncContext } from '@powersync/react';
import { useEffect, useState } from 'react';
import AppInitializer from '@/components/providers/AppInitializer';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import { Toaster } from '@/components/ui/toaster';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner';
import FeedbackWidget from '@/components/ui/FeedbackWidget';
import MobileTabBar from '@/components/layout/MobileTabBar';
import LocalStoreErrorBanner from '@/components/ui/LocalStoreErrorBanner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // undefined = loading, null = failed, PowerSyncDatabase = ready
  const [powerSyncDB, setPowerSyncDB] = useState<any>(undefined);
  // Kept apart from powerSyncDB so the failure is a state the UI can render,
  // not something only a console reader would ever find out about.
  const [localStoreFailed, setLocalStoreFailed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });
    }
  }, []);

  // Initialize PowerSync once on mount
  useEffect(() => {
    const init = async () => {
      try {
        const { initPowerSync, getPowerSync } = await import('@/lib/powersync/client');
        await initPowerSync();
        setPowerSyncDB(getPowerSync());
        setLocalStoreFailed(false);
      } catch (error) {
        Logger.error(LogContext.SYSTEM, 'Local read cache failed to open', { error });
        // Still resolve the loading state. The local store is a cache, so the
        // rest of the app has to render without it rather than spin forever.
        setPowerSyncDB(null);
        setLocalStoreFailed(true);
      }
    };
    init();
  }, []);

  const isPublicRouteByPath = pathname === '/';

  // Show loading spinner while PowerSync initializes
  if (powerSyncDB === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppInitializer />
      <Analytics />
      <ThemeProvider>
      <AuthProvider>
        <AnnouncementBanner />
        <LocalStoreErrorBanner failed={localStoreFailed} />
        <PowerSyncContext.Provider value={powerSyncDB}>
          <NetworkSyncProvider>
            <FlashcardProvider>
              <StudySessionProvider>
                {isPublicRouteByPath && <PublicHeader />}
                {children}
                <MobileTabBar />
                <OfflineIndicator />
                <FeedbackWidget />
                <Toaster />
              </StudySessionProvider>
            </FlashcardProvider>
          </NetworkSyncProvider>
        </PowerSyncContext.Provider>
      </AuthProvider>
      </ThemeProvider>
    </>
  );
}
