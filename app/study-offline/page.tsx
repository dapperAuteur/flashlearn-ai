'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStudySession } from '@/contexts/StudySessionContext';
import StudySessionManager from '@/components/study/StudySessionManager';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export default function StudyOfflinePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setId = searchParams.get('id');
  
  const { sessionId, isLoading, startSession } = useStudySession();

  useEffect(() => {
    if (!setId) {
      // router.push('/flashcards');
      console.log('no setId');
      return;
    }

    if (!sessionId && !isLoading) {
      Logger.log(LogContext.STUDY, "Starting offline session", { setId });
      startSession(setId, 'front-to-back');
    }
  }, [setId, sessionId, isLoading, startSession, router]);

  if (!setId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No set selected</p>
      </div>
    );
  }

  return <StudySessionManager />;
}