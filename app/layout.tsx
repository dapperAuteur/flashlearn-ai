'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import PublicHeader from '@/components/layout/PublicHeader';
import { usePathname } from 'next/navigation';
import '@/lib/services/syncService';
import { StudySessionProvider } from '@/contexts/StudySessionContext';
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Show public header for these routes
  const publicRoutes = ['/study', '/generate', '/'];
  const showPublicHeader = publicRoutes.includes(pathname);

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Analytics />
          <StudySessionProvider>
            {showPublicHeader && <PublicHeader />}
            {children}
          </StudySessionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}