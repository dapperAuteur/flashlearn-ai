'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PowerSyncContext } from '@powersync/react';
import { initPowerSync } from '@/lib/powersync/client';
import { FlashcardProvider } from '@/contexts/FlashcardContext';
import { useSync } from '@/hooks/useSync';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import Header from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toaster';
import { useOnboarding } from '@/hooks/OnboardingHooks';
import OnboardingModal from '@/components/ui/OnboardingModal';

/**
 * Dashboard layout with authentication check and context-aware navigation.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();
  const { isOnline } = useSync();
  const {
  showOnboarding,
  currentStep,
  nextStep,
  previousStep,
  completeOnboarding,
  skipOnboarding,
} = useOnboarding();
  const [powerSync, setPowerSync] = useState<Awaited<ReturnType<typeof initPowerSync>> | null>(null);
  


  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  useEffect(() => {
    initPowerSync().then(setPowerSync);
  }, []);

  // Show loading state while checking authentication
  if (status === 'loading' || !powerSync) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render for unauthenticated users
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <PowerSyncContext.Provider value={powerSync}>
      <FlashcardProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          
          <main className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>

          <OfflineIndicator isOnline={isOnline} />
          <Toaster />
          <OnboardingModal
            isOpen={showOnboarding}
            currentStep={currentStep}
            onNext={nextStep}
            onPrevious={previousStep}
            onComplete={completeOnboarding}
            onSkip={skipOnboarding}
          />
        </div>
      </FlashcardProvider>
    </PowerSyncContext.Provider>
  );
}