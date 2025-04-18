// app/(dashboard)/dashboard/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

export const metadata: Metadata = {
  title: 'Dashboard | FlashLearn AI',
  description: 'Your FlashLearn AI Dashboard',
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  // Server-side authentication check
  if (!user) {
    console.log('User not authenticated (server-side), redirecting to sign in');
    redirect('/signin');
  }
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}!</h1>
        <p className="mt-1 text-gray-600">
          Here's an overview of your flashcards and learning progress.
        </p>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Flashcards */}
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div className="mx-4">
              <h2 className="text-sm font-medium text-gray-600">Total Flashcards</h2>
              <p className="text-lg font-semibold text-gray-700">0</p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/flashcards"
              className="text-sm text-blue-600 hover:underline"
            >
              View all flashcards →
            </Link>
          </div>
        </div>
        
        {/* Lists */}
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
            <div className="mx-4">
              <h2 className="text-sm font-medium text-gray-600">Lists</h2>
              <p className="text-lg font-semibold text-gray-700">0</p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/lists"
              className="text-sm text-green-600 hover:underline"
            >
              Manage lists →
            </Link>
          </div>
        </div>
        
        {/* Study Sessions */}
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
            <div className="mx-4">
              <h2 className="text-sm font-medium text-gray-600">Study Sessions</h2>
              <p className="text-lg font-semibold text-gray-700">0</p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/study"
              className="text-sm text-purple-600 hover:underline"
            >
              Start studying →
            </Link>
          </div>
        </div>
        
        {/* Mastery Level */}
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <div className="mx-4">
              <h2 className="text-sm font-medium text-gray-600">Mastery Level</h2>
              <p className="text-lg font-semibold text-gray-700">0%</p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/statistics"
              className="text-sm text-yellow-600 hover:underline"
            >
              View statistics →
            </Link>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/flashcards/create"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Flashcard
          </Link>
          <Link
            href="/lists/create"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Create List
          </Link>
          <Link
            href="/import"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Import Data
          </Link>
          <Link
            href="/study/start"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Start Studying
          </Link>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">No recent activity to display.</p>
          <p className="text-gray-500 mt-1">Start by creating your first flashcard!</p>
        </div>
      </div>
    </DashboardLayout>
  );
}