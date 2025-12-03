'use client';

import Link from 'next/link';
import { WifiIcon } from '@heroicons/react/24/outline';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <WifiIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">You&apos;re Offline</h1>
        <p className="text-gray-600 mb-6">
          No internet connection. Your study progress is saved locally.
        </p>
        <div className="space-y-4">
          <Link
            href="/study"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Continue Studying Offline
          </Link>
          <p className="text-sm text-gray-500">
            Your progress will sync when you&apos;re back online.
          </p>
        </div>
      </div>
    </div>
  );
}