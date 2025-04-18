// app/(dashboard)/profile/page.tsx
import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

export const metadata: Metadata = {
  title: 'Your Profile | FlashLearn AI',
  description: 'Manage your FlashLearn AI profile',
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  
  // Server-side authentication check
  if (!user) {
    redirect('/signin');
  }
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p className="mt-1 text-gray-600">
          Manage your account details and preferences.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Profile Header */}
        <div className="p-6 sm:p-8 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-20 w-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold">
              {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="ml-6">
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Free Plan
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Profile Details */}
        <div className="p-6 sm:p-8">
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 block w-full text-gray-900 sm:text-sm">{user.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 block w-full text-gray-900 sm:text-sm">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subscription</label>
                <p className="mt-1 block w-full text-gray-900 sm:text-sm">Free Plan</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Member Since</label>
                <p className="mt-1 block w-full text-gray-900 sm:text-sm">April 2025</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Profile
            </button>
          </div>
        </div>
        
        {/* Subscription Details (placeholder) */}
        <div className="p-6 sm:p-8 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Details</h3>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-gray-900">Free Plan</h4>
            <p className="mt-1 text-sm text-gray-500">Basic flashcard features with limited storage.</p>
            <ul className="mt-3 text-sm text-gray-500 space-y-1">
              <li className="flex items-center">
                <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Basic flashcard creation
              </li>
              <li className="flex items-center">
                <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Up to 100 flashcards
              </li>
              <li className="flex items-center">
                <svg className="h-4 w-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                AI content generation
              </li>
              <li className="flex items-center">
                <svg className="h-4 w-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Team collaboration
              </li>
            </ul>
          </div>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}