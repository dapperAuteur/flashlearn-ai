import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import FlashcardManagerV2 from "@/components/flashcards/FlashcardManagerV2";

export const metadata: Metadata = {
  title: "Flashcards | FlashLearn AI",
  description: "Manage your flashcards with offline support",
};

export default async function FlashcardsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    console.log("User not authenticated (server-side), redirecting to sign in");
    redirect("/auth/signin");
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flashcards</h1>
          <p className="mt-1 text-gray-600">
            Create, organize, and manage your flashcards. Download sets for offline study.
          </p>
        </div>
      </div>
      
      <FlashcardManagerV2 />
    </div>
  );
}