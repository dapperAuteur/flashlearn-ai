"use client"

// import { Metadata } from "next";
// import { redirect } from "next/navigation";
// import { getCurrentUser } from "@/lib/auth/session";
import FlashcardManagerV2 from "@/components/flashcards/FlashcardManagerV2";
import OfflineStudyModal from '@/components/study/OfflineStudyModal';
import { useState } from 'react'

// export const metadata: Metadata = {
//   title: "Flashcards | FlashLearn AI",
//   description: "Manage your flashcards with offline support",
// };

export default function FlashcardsPage() {
  const [offlineStudySetId, setOfflineStudySetId] = useState<string | null>(null);
  
  return (
    <>
      <p className="mt-1 text-gray-600">
        Create, organize, and manage your flashcards. Download sets for offline study.
      </p>
      <FlashcardManagerV2 onOfflineStudy={setOfflineStudySetId} />
      <OfflineStudyModal 
        setId={offlineStudySetId} 
        onClose={() => setOfflineStudySetId(null)} 
      />
    </>
  );
}