/* eslint-disable @typescript-eslint/no-unused-vars */
import { notFound } from "next/navigation";
import dbConnect from "@/lib/db/mongodb";
import StudySession, { IStudySession } from "@/models/StudySession";
import { FlashcardSet } from "@/models/FlashcardSet";
import { isValidObjectId, Types } from "mongoose";
import ShareableResultsCard from "@/components/study/ShareableResultsCard";

interface ResultsPageProps {
  params: {
    sessionId: string;
  };
}

// Define the shape of the populated session data
type PopulatedStudySession = IStudySession & {
  listId: {
    _id: Types.ObjectId;
    isPublic: boolean;
    title: string;
  };
};

// This function now fetches the session and the set name together
async function getPublicSessionResults(sessionId: string): Promise<(IStudySession & { setName: string }) | null> {
  if (!isValidObjectId(sessionId)) {
    return null;
  }
  
  await dbConnect;

  // 1. Fetch the session and populate the 'listId' field to get the set details
  const session = await StudySession.findById(sessionId)
    .populate<{ listId: PopulatedStudySession['listId'] }>('listId', 'isPublic title')
    .lean<PopulatedStudySession>();
  
  // 2. SECURITY CHECK: Ensure the session, list, and public status are all valid
  if (!session || !session.listId || !session.listId.isPublic) {
    return null; 
  }
  
  // 3. Construct a clean results object with the set name
  const results = {
    ...session,
    setName: session.listId.title, // Add the set name to our results object
  };
  
  return JSON.parse(JSON.stringify(results));
}

// The main page component
export default async function PublicResultsPage({ params }: ResultsPageProps) {
  const sessionResults = await getPublicSessionResults(params.sessionId);

  if (!sessionResults) {
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
      {/* Pass the complete results object, including setName, to the client component */}
      <ShareableResultsCard initialResults={sessionResults} />
    </div>
  );
}

