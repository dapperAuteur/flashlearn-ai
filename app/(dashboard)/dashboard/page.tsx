// app/(dashboard)/dashboard/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatisticCard from '@/components/ui/StatisticCard';
import { useAuth } from '@/components/providers/TempAuthProvider';
import {
  BookOpenIcon,
  ClockIcon,
  FireIcon,
  CheckCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  
  // This would normally come from a database query
  const stats = {
    totalFlashcards: 0,
    studySessions: 0,
    streak: 0,
    correctRate: '0%',
  };
  
  // Redirect if not authenticated (additional safety check)
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);
  
  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name || 'User'}!</h1>
        <p className="mt-1 text-gray-600">
          Get started by creating your first flashcard set or exploring the app.
        </p>
      </div>
      
      {/* Statistics Section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Your Statistics</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatisticCard
            title="Total Flashcards"
            value={stats.totalFlashcards}
            icon={<BookOpenIcon className="h-6 w-6" />}
            linkHref="/flashcards"
            linkText="View all"
            color="blue"
          />
          
          <StatisticCard
            title="Study Sessions"
            value={stats.studySessions}
            icon={<ClockIcon className="h-6 w-6" />}
            linkHref="/study"
            linkText="Start studying"
            color="green"
          />
          
          <StatisticCard
            title="Current Streak"
            value={stats.streak}
            description="days in a row"
            icon={<FireIcon className="h-6 w-6" />}
            color="purple"
          />
          
          <StatisticCard
            title="Correct Rate"
            value={stats.correctRate}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            linkHref="/analytics"
            linkText="View details"
            color="yellow"
          />
        </div>
      </div>
      
      {/* Quick Actions Section */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/flashcards/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create New Flashcard
          </Link>
          <Link
            href="/flashcards/import"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Import Flashcards
          </Link>
          <Link
            href="/study"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Start Studying
          </Link>
        </div>
      </div>
      
      {/* Subscription Status */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Your Subscription</h2>
        <p className="text-gray-600">{user.role === 'free' ? 'Free Plan' : 'Premium Plan'}</p>
        
        {user.role === 'free' && (
          <div className="mt-4">
            <Link 
              href="/pricing"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Upgrade to Premium
            </Link>
          </div>
        )}
      </div>
      
      {/* Recent Activity Placeholder */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-center py-4">
          <p className="text-gray-500">No recent activity to show.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}