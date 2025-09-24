'use client';

import Link from 'next/link';
import { 
  HomeIcon, 
  AcademicCapIcon,
  SparklesIcon,
  ArrowLeftIcon 
} from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* 404 Icon */}
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mb-8 shadow-lg">
            <span className="text-4xl">📚</span>
          </div>
          
          {/* Main Content */}
          <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-4">
            404
          </h1>
          
          <h2 className="text-2xl md:text-3xl font-bold text-gray-700 mb-6">
            This Page Took a Study Break
          </h2>
          
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            The flashcard you&apos;re looking for seems to have flipped away. 
            Don&apos;t worry – we have plenty more learning materials waiting for you!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <HomeIcon className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
            
            <Link
              href="/generate"
              className="inline-flex items-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              Create Flashcards
            </Link>
          </div>

          {/* Helpful Links */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Popular Destinations
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link 
                href="/study"
                className="group flex items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all duration-300"
              >
                <div className="bg-blue-500 rounded-lg w-10 h-10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                  <AcademicCapIcon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">Study Sets</div>
                  <div className="text-sm text-gray-600">Practice with flashcards</div>
                </div>
              </Link>
              
              <Link 
                href="/dashboard"
                className="group flex items-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:shadow-md transition-all duration-300"
              >
                <div className="bg-green-500 rounded-lg w-10 h-10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                  <div className="w-5 h-5 bg-white rounded opacity-90" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">Dashboard</div>
                  <div className="text-sm text-gray-600">View your progress</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Go Back Button */}
          <div className="mt-8">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Go back to previous page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}