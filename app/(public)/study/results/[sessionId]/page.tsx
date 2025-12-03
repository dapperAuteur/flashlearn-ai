'use client';

// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
import StudySessionResults from "@/components/study/StudySessionResults";

export default function StudyResultsPage() {
  // const router = useRouter();
  
  // useEffect(() => {
  //   router.replace('/flashcards');
  // }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <StudySessionResults />
    </div>
  );
}

