'use client';

import { useEffect } from 'react';
import { StudySessionProvider } from '@/contexts/StudySessionContext';
import StudySessionManager from '@/components/study/StudySessionManager';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export default function StudyPage() {
  useEffect(() => {
    Logger.log(LogContext.STUDY, "Study page loaded");
  }, []);

  return (
    <StudySessionProvider>
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 dark:text-gray-700">
          Study Session
        </h1>
        <StudySessionManager />
      </div>
    </StudySessionProvider>
  );
}