// lib/analytics/ab-test.ts

export interface ABTestEvent {
  variant: 'A' | 'B' | 'C';
  event: 'view' | 'signup_click' | 'signin_click' | 'generate_click' | 'study_click' | 'dashboard_click';
  timestamp: number;
  userId?: string;
  sessionId: string;
  userAgent?: string;
  referrer?: string;
}

export interface ABTestResults {
  variant: 'A' | 'B' | 'C';
  views: number;
  signups: number;
  generates: number;
  studies: number;
  conversionRate: number;
  engagementRate: number;
}

/**
 * Get or assign A/B test variant for current user
 */
export const getVariant = (): 'A' | 'B' | 'C' => {
  if (typeof window === 'undefined') return 'A';
  
  let variant = localStorage.getItem('ab-test-variant') as 'A' | 'B' | 'C' | null;
  
  if (!variant) {
    // Equal distribution across variants
    const variants: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
    variant = variants[Math.floor(Math.random() * variants.length)];
    localStorage.setItem('ab-test-variant', variant);
    localStorage.setItem('ab-test-assigned-at', new Date().toISOString());
  }
  
  return variant;
};

/**
 * Get or create session ID for tracking
 */
export const getSessionId = (): string => {
  if (typeof window === 'undefined') return `session_${Date.now()}`;
  
  let sessionId = localStorage.getItem('ab-session-id');
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem('ab-session-id', sessionId);
  }
  
  return sessionId;
};

/**
 * Track A/B test event
 */
export const trackEvent = (event: Omit<ABTestEvent, 'timestamp' | 'sessionId' | 'userAgent' | 'referrer'>) => {
  if (typeof window === 'undefined') return;

  const sessionId = getSessionId();

  const eventData: ABTestEvent = {
    ...event,
    timestamp: Date.now(),
    sessionId,
    userAgent: navigator.userAgent,
    referrer: document.referrer,
  };

  // Store events locally (in production, send to your analytics service)
  const events = getStoredEvents();
  events.push(eventData);
  localStorage.setItem('ab-test-events', JSON.stringify(events));

  // Also send to console for development
  console.log('A/B Test Event Tracked:', eventData);

  // In production, you'd send this to your analytics service:
  // sendToAnalytics(eventData);
};

/**
 * Get stored events from localStorage
 */
export const getStoredEvents = (): ABTestEvent[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    return JSON.parse(localStorage.getItem('ab-test-events') || '[]');
  } catch {
    return [];
  }
};

/**
 * Calculate A/B test results
 */
export const calculateResults = (): Record<'A' | 'B' | 'C', ABTestResults> => {
  const events = getStoredEvents();

  const results: Record<'A' | 'B' | 'C', ABTestResults> = {
    A: { variant: 'A', views: 0, signups: 0, generates: 0, studies: 0, conversionRate: 0, engagementRate: 0 },
    B: { variant: 'B', views: 0, signups: 0, generates: 0, studies: 0, conversionRate: 0, engagementRate: 0 },
    C: { variant: 'C', views: 0, signups: 0, generates: 0, studies: 0, conversionRate: 0, engagementRate: 0 }
  };

  events.forEach(event => {
    const variant = results[event.variant];
    
    switch (event.event) {
      case 'view':
        variant.views++;
        break;
      case 'signup_click':
        variant.signups++;
        break;
      case 'generate_click':
        variant.generates++;
        break;
      case 'study_click':
        variant.studies++;
        break;
    }
  });

  // Calculate rates
  Object.values(results).forEach(result => {
    if (result.views > 0) {
      result.conversionRate = (result.signups / result.views) * 100;
      result.engagementRate = ((result.generates + result.studies) / result.views) * 100;
    }
  });

  return results;
};

/**
 * Reset A/B test data (for development/testing)
 */
export const resetABTest = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('ab-test-events');
  localStorage.removeItem('ab-test-variant');
  localStorage.removeItem('ab-session-id');
  localStorage.removeItem('ab-test-assigned-at');
};

/**
 * Get statistical significance (simplified chi-square test)
 */
export const getStatisticalSignificance = (results: Record<'A' | 'B' | 'C', ABTestResults>) => {
  // This is a simplified statistical test
  // In production, use a proper statistical library like jStat
  const variants = Object.values(results);
  const totalViews = variants.reduce((sum, v) => sum + v.views, 0);
  const totalSignups = variants.reduce((sum, v) => sum + v.signups, 0);
  
  if (totalViews < 100 || totalSignups < 10) {
    return { isSignificant: false, message: 'Need more data for statistical significance' };
  }

  // Simple test: if any variant has >20% higher conversion rate with >30 conversions
  const sortedByConversion = variants.sort((a, b) => b.conversionRate - a.conversionRate);
  const best = sortedByConversion[0];
  const worst = sortedByConversion[2];
  
  const improvementPercentage = ((best.conversionRate - worst.conversionRate) / worst.conversionRate) * 100;
  
  return {
    isSignificant: improvementPercentage > 20 && best.signups > 30,
    message: `${best.variant} shows ${improvementPercentage.toFixed(1)}% improvement over ${worst.variant}`,
    bestVariant: best.variant,
    improvement: improvementPercentage
  };
};

/**
 * Export data for analysis (CSV format)
 */
export const exportToCSV = (): string => {
  const events = getStoredEvents();
  
  const headers = ['timestamp', 'variant', 'event', 'sessionId', 'userId', 'userAgent', 'referrer'];
  const csvRows = [
    headers.join(','),
    ...events.map(event => [
      new Date(event.timestamp).toISOString(),
      event.variant,
      event.event,
      event.sessionId,
      event.userId || '',
      `"${event.userAgent?.replace(/"/g, '""') || ''}"`,
      `"${event.referrer?.replace(/"/g, '""') || ''}"`
    ].join(','))
  ];
  
  return csvRows.join('\n');
};

// Example usage in production analytics service integration:
/*
const sendToAnalytics = async (event: ABTestEvent) => {
  try {
    await fetch('/api/analytics/ab-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  } catch (error) {
    console.error('Failed to send analytics event:', error);
  }
};
*/