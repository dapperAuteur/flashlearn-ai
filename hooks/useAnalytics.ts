/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useAnalytics.ts
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
}

export function useAnalytics() {
  const { data: session } = useSession();
  const sessionStartTime = useRef<number>(Date.now());
  const pageStartTime = useRef<number>(Date.now());

  // Track page views and session time
  useEffect(() => {
    pageStartTime.current = Date.now();
    
    // Track page view
    trackEvent('page_view', {
      page: window.location.pathname,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    });

    // Track session time on page unload
    const handleBeforeUnload = () => {
      const timeSpent = Math.round((Date.now() - pageStartTime.current) / 1000);
      trackEvent('page_time', {
        page: window.location.pathname,
        timeSpent,
        sessionTime: Math.round((Date.now() - sessionStartTime.current) / 1000),
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Track acquisition data on first visit
  useEffect(() => {
    if (session?.user && !localStorage.getItem('analytics_tracked')) {
      const urlParams = new URLSearchParams(window.location.search);
      const referrer = document.referrer;
      
      trackEvent('acquisition', {
        source: urlParams.get('utm_source') || getReferrerSource(referrer),
        medium: urlParams.get('utm_medium') || 'organic',
        campaign: urlParams.get('utm_campaign'),
        landingPage: window.location.pathname,
        referrer,
      });
      
      localStorage.setItem('analytics_tracked', 'true');
    }
  }, [session]);

  const trackEvent = async (event: string, properties?: Record<string, any>) => {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          properties: {
            ...properties,
            userId: session?.user?.id,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  };

  const trackStudySession = (setId: string, duration: number, cardsStudied: number) => {
    trackEvent('study_session_completed', {
      flashcardSetId: setId,
      duration,
      cardsStudied,
      completionRate: cardsStudied > 0 ? 1 : 0,
    });
  };

  const trackPurchase = (plan: string, value: number) => {
    trackEvent('purchase_completed', {
      plan,
      value,
      convertedAfterDays: Math.round((Date.now() - sessionStartTime.current) / (1000 * 60 * 60 * 24)),
    });
  };

  return {
    trackEvent,
    trackStudySession,
    trackPurchase,
  };
}

function getReferrerSource(referrer: string): string {
  if (!referrer) return 'direct';
  if (referrer.includes('google')) return 'google';
  if (referrer.includes('facebook')) return 'facebook';
  if (referrer.includes('twitter')) return 'twitter';
  if (referrer.includes('linkedin')) return 'linkedin';
  return 'referral';
}