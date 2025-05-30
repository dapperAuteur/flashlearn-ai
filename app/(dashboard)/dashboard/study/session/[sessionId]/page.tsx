// app/dashboard/study/[sessionId]/page.tsx
import { Metadata } from 'next';
import StudySessionInterface from '@/components/study/StudySessionInterface';
import { LogContext, Logger } from '@/lib/logging/client-logger';


export const metadata: Metadata = {
  title: 'Study Session | FlashLearn AI',
};

interface StudyPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function StudyPage({ params }: StudyPageProps) {
  const { sessionId } = await params;
  
  Logger.log(LogContext.STUDY, "StudyPage sessionId", {
    sessionId,
    params
  })
  
  return (
    <div className="min-h-screen bg-gray-800">
      <StudySessionInterface sessionId={sessionId} />
    </div>
  );
}