'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useStudySession } from '@/contexts/StudySessionContext';
import StudySessionManager from '@/components/study/StudySessionManager';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export default function StudyPage() {
  const params = useParams();
  const setId = params.setId as string;
  
  const {
    sessionId,
    isLoading,
    startSession,
    studyDirection
  } = useStudySession();

  // Auto-start session when page loads
  useEffect(() => {
    if (setId && !sessionId && !isLoading) {
      Logger.log(LogContext.STUDY, "Auto-starting session from direct link", { setId });
      startSession(setId, studyDirection || 'front-to-back');
    }
  }, [setId, sessionId, isLoading, startSession, studyDirection]);

  return <StudySessionManager />;
}