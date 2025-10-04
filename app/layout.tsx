/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import PublicHeader from '@/components/layout/PublicHeader';
import { usePathname } from 'next/navigation';
import '@/lib/services/syncService';
import { StudySessionProvider } from '@/contexts/StudySessionContext';
import { Analytics } from "@vercel/analytics/next"
import { FlashcardProvider } from '@/contexts/FlashcardContext';
import { PowerSyncContext } from '@powersync/react';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [powerSyncDB, setPowerSyncDB] = useState<any>(null);

  // Initialize PowerSync once on mount
  useEffect(() => {
    const initPowerSync = async () => {
      try {
        const { initPowerSync, getPowerSync } = await import('@/lib/powersync/client');
        await initPowerSync();
        const db = getPowerSync();
        setPowerSyncDB(db);
      } catch (error) {
        console.error('PowerSync initialization failed:', error);
        // Continue without PowerSync for unauthenticated users
        setPowerSyncDB({});
      }
    };
    
    initPowerSync();
  }, []);
  
  // Show public header for these routes
  // The root page is the only one that needs this explicit check now
  const isPublicRouteByPath = pathname === '/';
  
  // Don't render until PowerSync is ready
  if (!powerSyncDB) {
    return (
      <html lang="en">
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