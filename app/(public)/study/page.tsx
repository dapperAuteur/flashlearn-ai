'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import StudySessionManager from '@/components/study/StudySessionManager';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export default function StudyPage() {
  const searchParams = useSearchParams();
  const setId = searchParams.get('setId') || undefined;
  const isReviewMode = searchParams.get('review') === 'true';

  useEffect(() => {
    Logger.log(LogContext.STUDY, "Study page loaded", { setId, isReviewMode });
  }, [setId, isReviewMode]);

  return (
    <div className="flex-1 min-h-0 flex flex-col container mx-auto max-w-5xl px-2 sm:px-6 lg:px-8">
      <h1 className="text-sm sm:text-base font-semibold mb-1 text-gray-800 dark:text-gray-700">
        {isReviewMode ? 'Review Session' : 'Study Session'}
      </h1>
      <StudySessionManager preSelectedSetId={setId} isReviewMode={isReviewMode} />
    </div>
  );
}