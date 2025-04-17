// app/(dashboard)/dashboard/page.tsx
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";

export const metadata: Metadata = {
  title: "Dashboard | FlashLearn AI",
  description: "Your FlashLearn AI dashboard",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  // Server-side authentication check
  if (!user) {
    console.log("User not authenticated (server-side), redirecting to sign in");
    redirect("/signin");
  }
  
  return (
    <DashboardLayout>
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}!</h1>
        <p className="mt-2 text-gray-600">
          Get started by creating your first flashcard set or exploring the app.
        </p>
        
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-blue-50 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Flashcards
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">0</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-blue-100 px-5 py-3">
              <div className="text-sm">
                <Link href="/flashcards" className="font-medium text-blue-700 hover:text-blue-900">
                  View all
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Study Sessions
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">0</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-blue-100 px-5 py-3">
              <div className="text-sm">
                <Link href="/study" className="font-medium text-blue-700 hover:text-blue-900">
                  Start studying
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Your Account
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{user.role}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-blue-100 px-5 py-3">
              <div className="text-sm">
                <Link href="/account" className="font-medium text-blue-700 hover:text-blue-900">
                  Manage account
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/flashcards/new"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create New Flashcard
            </Link>
            <Link
              href="/lists/new"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create New List
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}