'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const ONBOARDING_STORAGE_KEY = 'flashlearn_onboarding_completed';

export function useOnboarding() {
  const { data: session, status } = useSession();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Only show onboarding for authenticated users
    if (status === 'authenticated' && session?.user) {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!completed) {
        setShowOnboarding(true);
      }
    }
  }, [status, session]);

  useEffect(() => {
  console.log('Onboarding check:', { status, hasUser: !!session?.user });
  if (status === 'authenticated' && session?.user) {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    console.log('Onboarding completed:', completed);
    if (!completed) {
      console.log('Starting onboarding...');
      setShowOnboarding(true);
    }
  }
}, [status, session]);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
    setCurrentStep(0);
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const previousStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  return {
    showOnboarding,
    currentStep,
    nextStep,
    previousStep,
    completeOnboarding,
    skipOnboarding,
  };
}