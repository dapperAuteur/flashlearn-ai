import { notFound } from "next/navigation";
import dbConnect from "@/lib/db/mongodb";
import StudySession, { IStudySession } from "@/models/StudySession";
import { FlashcardSet } from "@/models/FlashcardSet";
import { isValidObjectId } from "mongoose";
import ShareableResultsCard from "@/components/study/ShareableResultsCard";

interface ResultsPageProps {
  params: {
    sessionId: string;
  };
}

// This function runs on the server to securely fetch the data
async function getPublicSessionResults(sessionId: string): Promise<IStudySession | null> {
  if (!isValidObjectId(sessionId)) {
    return null;
  }
  
  await dbConnect;

  // 1. Fetch the study session
  const session = await StudySession.findById(sessionId).lean<IStudySession>();
  if (!session) {
    return null; // Session doesn't exist
  }

  // 2. Fetch the associated flashcard set to check its visibility
  const flashcardSet = await FlashcardSet.findById(session.listId).select('isPublic').lean();
  
  // 3. SECURITY CHECK: Only return the session if the set is public
  if (!flashcardSet || !flashcardSet.isPublic) {
    return null; // The associated set is private, so we don't show the results
  }
  
  return JSON.parse(JSON.stringify(session));
}

// The main page component
export default async function PublicResultsPage({ params }: ResultsPageProps) {
  const sessionResults = await getPublicSessionResults(params.sessionId);

  if (!sessionResults) {
    // We can show a generic not found or a more specific "private results" page
    return (
        <div className="container mx-auto max-w-2xl px-4 py-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Results Not Available</h1>
            <p className="text-gray-600 dark:text-gray-400">
                These study results are either private or the session could not be found.
            </p>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* We will create the ShareableResultsCard component next */}
      <ShareableResultsCard initialResults={sessionResults} />
    </div>
  );
}
