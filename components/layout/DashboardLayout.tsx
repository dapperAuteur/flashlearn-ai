/* eslint-disable @typescript-eslint/no-unused-vars */
// components/layout/DashboardLayout.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';


interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  
  // Close sidebar when screen is resized to desktop view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Check if user is authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('User not authenticated, redirecting to sign in page');
      router.push('/signin');
    }
  }, [status, router]);
  
  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
          <p className="text-gray-500">Please wait while we load your dashboard.</p>
        </div>
      </div>
    );
  }
  
  // Don't render for unauthenticated users
  if (status === 'unauthenticated') {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex pt-16">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
        
        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 ml-0 md:ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}