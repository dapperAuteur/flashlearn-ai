'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">You&apos;re Offline</h1>
        <p className="text-gray-600 mb-6">
          Go to your flashcards to study offline sets
        </p>
        <a href="/flashcards" className="px-6 py-3 bg-blue-600 text-white rounded-lg">
          Go to Flashcards
        </a>
      </div>
    </div>
  );
}