'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatisticCard from '@/components/ui/StatisticCard';
import { useSession } from 'next-auth/react';
import { useFlashcards } from '@/contexts/FlashcardContext';
import { initPowerSync } from '@/lib/powersync/client';

import {
  BookOpenIcon,
  ClockIcon,
  FireIcon,
  CheckCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const router = useRouter();
  const { flashcardSets, createFlashcardSet } = useFlashcards();
  const [powerSync, setPowerSync] = useState<Awaited<ReturnType<typeof initPowerSync>> | null>(null);

  const testCreate = async () => {
    console.log('Test button clicked');
    console.log('Session:', session?.user?.id);
    if (!session?.user?.id) {
      console.error('No user ID');
      return;
    }
    try {
      const id = await createFlashcardSet({
        user_id: session.user.id,
        title: 'Test Set',
        description: 'Testing PowerSync',
        is_public: 0,
        card_count: 0,
        source: 'CSV',
        is_deleted: 0,
      });
      console.log('Created set:', id);
      console.log('All sets:', flashcardSets);
    } catch (error) {
      console.error('Create failed:', error);
    }
  };
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('DashboardPage() status :>> ', status);
    }
  }, [status, router]);

  useEffect(() => {
  initPowerSync()
    .then(async (db) => {
      await db.waitForReady(); // Wait for database to be ready
      console.log('PowerSync ready');
      setPowerSync(db);
    })
    .catch(console.error);
}, []);
  
  // Mock stats data
  const stats = {
    totalFlashcards: 0,
    studySessions: 0,
    streak: 0,
    correctRate: '0%',
  };
  
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <div>
      <div className="p-8 text-black">
      <button
        onClick={testCreate}
        className="bg-blue-600 px-4 py-2 rounded"
      >
        Test Create Set
      </button>
      <div className="mt-4">
        <h2 className="font-bold">Sets ({flashcardSets.length}):</h2>
        <pre>{JSON.stringify(flashcardSets, null, 2)}</pre>
      </div>
    </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}!</h1>
        <p className="mt-1 text-gray-600">
          Get started by creating your first flashcard set or exploring the app.
        </p>
      </div>
      
      {/* Statistics Section */}
      <div className="mb-8" data-onboarding="stats">
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
      <div data-onboarding="actions">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/generate"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create New Flashcard
          </Link>
          <Link
            href="/generate"
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
        <p className="text-gray-600">{user.role === 'Student' ? 'Free Plan' : 'Premium Plan'}</p>
        
        {user.role === 'Student' && (
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
    </div>
  );
}