// app/(dashboard)/flashcards/page.tsx
import { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { PlusIcon } from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Flashcards | FlashLearn AI",
  description: "Manage your flashcards",
};

export default async function FlashcardsPage() {
  const user = await getCurrentUser();
  
  // Server-side authentication check
  if (!user) {
    console.log("User not authenticated (server-side), redirecting to sign in");
    redirect("/signin");
  }
  
  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flashcards</h1>
          <p className="mt-1 text-gray-600">
            Create, organize, and manage your flashcards.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/dashboard/flashcards/create"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Flashcard
          </Link>
          <Link
            href="/flashcards/import"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Import
          </Link>
        </div>
      </div>
      
      {/* Tabs for flashcard organization */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            All Flashcards
          <a
          
            href="#"
            className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Recent
          </a>
          
            <a href="#"
            className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Categories
          </a>
          
            <a href="#"
            className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Tags
          </a>
        </nav>
      </div>
      
      {/* Empty state */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-16 sm:px-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No flashcards</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new flashcard or importing from a file.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/flashcards/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Flashcard
            </Link>
          </div>
        </div>
      </div>
      
      {/* CSV Template Download - We'll implement this feature later */}
      <div className="mt-6 bg-gray-50 shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Bulk Import Template
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Download a CSV template to bulk import flashcards.</p>
          </div>
          <div className="mt-3">
            <Link
              href="/download/flashcard-template.csv"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Download Template
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}