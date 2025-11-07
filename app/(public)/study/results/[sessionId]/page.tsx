'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudyResultsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/flashcards');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting...</p>
    </div>
  );
}

