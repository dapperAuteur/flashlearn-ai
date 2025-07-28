import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

export const metadata: Metadata = {
  title: 'Statistics | FlashLearn AI',
  description: 'View your statistics',
};

export default async function StatisticsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/signin');
  }
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Statistics</h1>
        <p className="mt-1 text-gray-600">
          View your statistics.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            ></path>
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No statistics</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first flashcard.
          </p>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Flashcard
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}