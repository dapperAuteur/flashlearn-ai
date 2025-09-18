import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Analytics | FlashLearn AI",
  description: "Track your learning progress",
};

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  
  // Server-side authentication check
  if (!user) {
    console.log("User not authenticated (server-side), redirecting to sign in");
    redirect("/signin");
  }
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-gray-600">
          Track your learning progress and performance metrics.
        </p>
      </div>
      
      {/* Overview Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Performance Overview
          </h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-500">No data available yet. Start studying to see your analytics.</p>
        </div>
      </div>
      
      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-md leading-6 font-medium text-gray-900">
              Study Time per Week
            </h3>
          </div>
          <div className="p-6 h-64 flex items-center justify-center">
            <p className="text-gray-500">Chart will appear here once you have study data.</p>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-md leading-6 font-medium text-gray-900">
              Recall Performance by Category
            </h3>
          </div>
          <div className="p-6 h-64 flex items-center justify-center">
            <p className="text-gray-500">Chart will appear here once you have study data.</p>
          </div>
        </div>
      </div>
      
      {/* Learning Progress */}
      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Learning Progress
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Track how well you&apos;re learning each flashcard.
          </p>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-500">No learning data available yet.</p>
        </div>
      </div>
      </div>
  );
}