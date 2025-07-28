'use client';

import { useEffect } from 'react';
import StudySession from '@/components/study/StudySession';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export default function StudyPage() {
  useEffect(() => {
    Logger.log(LogContext.STUDY, "Study page loaded");
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400">Study Flashcards</h1>
      <StudySession />
    </div>
  );
}