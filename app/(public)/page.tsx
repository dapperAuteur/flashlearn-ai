import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import ABTestClientWrapper from "@/components/ab-test-client-wrapper";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
      </div>
    }>
      <ABTestClientWrapper 
        isAuthenticated={!!session}
        userName={session?.user?.name || null}
      />
    </Suspense>
  );
}