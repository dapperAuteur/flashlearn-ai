'use client';

import { useEffect } from 'react';
import StudySession from '@/components/study/StudySession';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export default function StudyPage() {
  useEffect(() => {
    Logger.log(LogContext.STUDY, "Study page loaded");
  }, []);

  return (
    // This container ensures consistent padding and max-width.
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
        Study Flashcards
      </h1>
      <StudySession />
    </div>
  );
}
