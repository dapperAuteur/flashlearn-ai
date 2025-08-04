'use client';

import { useState } from 'react';
import { useSync } from '@/hooks/useSync';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import Sidebar from '@/components/layout/Sidebar';
import MobileHeader from '@/components/ui/MobileHeader';
import { Toaster } from '@/components/ui/toaster';

/**
 * The main layout for the authenticated part of the application.
 * It now includes state management for the mobile sidebar and uses
 * the useSync hook to manage and display offline status.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOnline } = useSync();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-full relative">
      {/* --- Desktop Sidebar (always visible) --- */}
      <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-40">
        {/* The Sidebar component for desktop doesn't need props in this setup,
            but we pass them for consistency with mobile. */}
        <Sidebar isOpen={true} closeSidebar={() => {}} />
      </div>

      {/* --- Mobile Sidebar (conditionally rendered) --- */}
      {/* This uses the same Sidebar component, but its visibility is controlled by state */}
      <div className="md:hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          closeSidebar={() => setIsSidebarOpen(false)} 
        />
      </div>
      
      <main className="md:pl-72">
        <MobileHeader onOpen={() => setIsSidebarOpen(true)} />
        {children}
      </main>

      <OfflineIndicator isOnline={isOnline} />
      <Toaster />
    </div>
  );
}
