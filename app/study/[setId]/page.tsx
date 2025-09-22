// app/(dashboard)/study/[setId]/page.tsx
'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useStudySession } from '@/contexts/StudySessionContext';
import StudySessionManager from '@/components/study/StudySessionManager';

export default function StudySetPage() {
  const params = useParams();
  const setId = params.setId as string;
  const { startSession, studyDirection } = useStudySession();

  useEffect(() => {
    if (setId) {
      // Auto-start session with the specified set
      startSession(setId, studyDirection);
    }
  }, [setId, startSession, studyDirection]);

  return <StudySessionManager />;
}