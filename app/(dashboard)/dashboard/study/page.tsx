import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import StudySession from '@/components/study/StudySession';
import { Logger, LogContext } from '@/lib/logging/client-logger'; // Assuming this is also a client-side logger.

// This page is now a Server Component
export default async function StudyPage() {
  const session = await getServerSession(authOptions);
  Logger.log(LogContext.STUDY, "Study page loaded on client.");

  // We can perform data fetching here on the server
  // const flashcardSets = await fetchUserFlashcardSets(session.user.id);

  // You can still log on the server side
  if (session) {
    // You would use the server-side logger here, not the client one
    // Logger.info(LogContext.STUDY, "Study page loaded for authenticated user.", { userId: session.user.id });
  } else {
    // Logger.info(LogContext.STUDY, "Study page loaded for unauthenticated user.");
  }


  return (
    // This container ensures consistent padding and max-width.
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
        Study Flashcards
      </h1>
      {/* Pass the session as a prop to the client component */}
      <StudySession session={session} />
    </div>
  );
}

// In this case, since StudyPage is now a server component, we should probably
// also move the `useEffect` and its logging call to a new client component
// if you want that specific logging behavior. Or, better yet, use a server-side
// logger for server-side events, and keep client-side loggers for user
// interactions that happen after the page has loaded.
//
// Here is a new client component for the old useEffect logic:
//
// 'use client';
//
// import { useEffect } from 'react';
// import { Logger, LogContext } from '@/lib/logging/client-logger';
//
// export function StudyPageClientWrapper() {
//   useEffect(() => {
//     Logger.log(LogContext.STUDY, "Study page loaded on client.");
//   }, []);
//
//   return (
//     <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
//       <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
//         Study Flashcards
//       </h1>
//       <StudySession />
//     </div>
//   );
// }
//
// And the `StudyPage` would then be:
//
// export default async function StudyPage() {
//    return <StudyPageClientWrapper />;
// }

