// app/dashboard/study/[sessionId]/page.tsx
import { Metadata } from 'next';
import StudySessionInterface from '@/components/study/StudySessionInterface';


export const metadata: Metadata = {
  title: 'Study Session | FlashLearn AI',
};

interface StudyPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function StudyPage({ params }: StudyPageProps) {
  const { sessionId } = await params;
  console.log('/dashboard/study/[sessionId]/page.tsx 16 | StudyPage params :>> ', await params);
  console.log('/dashboard/study/[sessionId]/page.tsx 17 | StudyPage sessionId :>> ', sessionId);
  
  return (
    <div className="min-h-screen bg-gray-800">
      <StudySessionInterface sessionId={sessionId} />
    </div>
  );
}