'use client';

import { useEffect } from 'react';
import { StudySessionProvider } from '@/contexts/StudySessionContext';
import StudySessionManager from '@/components/study/StudySessionManager';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export default function StudyPage() {
  // This effect logs when the user first lands on the study page.
  useEffect(() => {
    Logger.log(LogContext.STUDY, "Study page loaded");
  }, []);

  return (
    // The StudySessionProvider now wraps the entire feature. Any component
    // rendered inside it can access our centralized study session state.
    <StudySessionProvider>
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          Study Session
        </h1>
        {/* The StudySessionManager is the new "controller" UI. We will build it in the next step. */}
        <StudySessionManager />
      </div>
    </StudySessionProvider>
  );
}