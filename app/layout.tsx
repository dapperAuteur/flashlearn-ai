/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import PublicHeader from '@/components/layout/PublicHeader';
import { usePathname } from 'next/navigation';
import { StudySessionProvider } from '@/contexts/StudySessionContext';
import { Analytics } from "@vercel/analytics/next"
import { FlashcardProvider } from '@/contexts/FlashcardContext';
import { PowerSyncContext } from '@powersync/react';
import { useEffect, useState } from 'react';
import AppInitializer from '@/components/providers/AppInitializer';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // undefined = loading, null = failed, PowerSyncDatabase = ready
  const [powerSyncDB, setPowerSyncDB] = useState<any>(undefined);

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
      } catch (error) {
        console.error('PowerSync initialization failed:', error);
        setPowerSyncDB(null);
      }
    };
    init();
  }, []);

  const isPublicRouteByPath = pathname === '/';

  // Show loading spinner while PowerSync initializes
  if (powerSyncDB === undefined) {
    return (
      <html lang="en">
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3B82F6" />
        <body className={inter.className}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <AppInitializer />
        <Analytics />
        <AuthProvider>
          <PowerSyncContext.Provider value={powerSyncDB}>
            <FlashcardProvider>
              <StudySessionProvider>
                {isPublicRouteByPath && <PublicHeader />}
                {children}
              </StudySessionProvider>
            </FlashcardProvider>
          </PowerSyncContext.Provider>
        </AuthProvider>
      </body>
    </html>
  );
}
