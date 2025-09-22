import { Suspense } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { GenerationHub } from '@/components/generation/GenerationHub';

export default function GenerateFlashcardsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <SparklesIcon className="h-4 w-4" />
              <span>AI-Powered Creation</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Generate Flashcards
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform any content into effective study materials using AI. 
              Choose your source and let our advanced AI create personalized flashcards.
            </p>
          </div>

          {/* Generation Hub */}
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            <GenerationHub />
          </Suspense>
        </div>
      </div>
    </div>
  );
}