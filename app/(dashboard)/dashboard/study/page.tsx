'use client';

import { Suspense, useEffect } from 'react';
import StudySession from '@/components/study/StudySession';
import { Logger, LogContext } from '@/lib/logging/client-logger';

// A simple loading component to show as a fallback
function StudySessionLoading() {
  return (
    <div className="flex justify-center items-center p-10 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <p className="text-gray-600 dark:text-gray-300">Loading Study Session...</p>
    </div>
  );
}

export default function StudyPage() {
  useEffect(() => {
    Logger.log(LogContext.STUDY, "Study page loaded");
  }, []);

  return (
    // This container ensures consistent padding and max-width.
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">
        Study Flashcards
      </h1>
      <Suspense fallback={<StudySessionLoading />}>
        <StudySession />
      </Suspense>
    </div>
  );
}
