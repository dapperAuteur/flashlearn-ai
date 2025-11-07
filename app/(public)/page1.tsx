/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { Brain, Zap, Users, TrendingUp, Clock, Sparkles } from "lucide-react";

// Authenticated Dashboard View
const AuthenticatedHome = ({ session }: { session: any }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session.user?.name || 'Learner'}!
          </h1>
          <p className="text-gray-600 mt-2">Ready to continue your learning journey?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/generate" className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Generate Flashcards</h3>
                <p className="text-sm text-gray-600">Create from text, PDF, or YouTube</p>
              </div>
            </div>
          </Link>
          
          <Link href="/flashcards" className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Study Session</h3>
                <p className="text-sm text-gray-600">Review your flashcards</p>
              </div>
            </div>
          </Link>
          
          <Link href="/dashboard" className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <h3 className="font-semibold text-gray-900">View Progress</h3>
                <p className="text-sm text-gray-600">Track your learning stats</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Biology Flashcards</p>
                <p className="text-sm text-gray-600">Last studied 2 hours ago</p>
              </div>
              <span className="text-sm text-green-600 font-medium">85% accuracy</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Spanish Vocabulary</p>
                <p className="text-sm text-gray-600">Last studied yesterday</p>
              </div>
              <span className="text-sm text-blue-600 font-medium">Ready to review</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Unauthenticated Landing Page View
const UnauthenticatedHome = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Learn Smarter with
              <span className="block text-yellow-300">AI-Powered Flashcards</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Transform any content into effective flashcards instantly. Our AI creates personalized study materials while spaced repetition ensures you remember what matters.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="bg-yellow-400 text-blue-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition-colors"
              >
                Start Learning Free
              </Link>
              <Link
                href="/generate"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors"
              >
                Try AI Generator
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Why FlashLearn AI Works
          </h2>
          <p className="text-xl text-gray-600 text-center mb-16 max-w-3xl mx-auto">
            Backed by cognitive science, our approach combines proven learning techniques with modern AI to maximize your retention and minimize study time.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Spaced Repetition Science</h3>
              <p className="text-gray-600">
                Our algorithm shows you cards just before you&apos;re about to forget them, increasing retention by up to 40% compared to traditional studying.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Content Creation</h3>
              <p className="text-gray-600">
                Upload PDFs, paste text, or share YouTube videos. Our AI instantly transforms any content into perfectly formatted flashcards, saving hours of manual work.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Progress Tracking</h3>
              <p className="text-gray-600">
                See your improvement over time with detailed analytics. Identify problem areas and celebrate your learning victories with clear progress metrics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            Everything You Need to Excel
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex space-x-4">
              <Clock className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Smart Study Scheduling</h3>
                <p className="text-gray-600">Get notified when it&apos;s the perfect time to review specific cards for maximum retention.</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <Users className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Team Collaboration</h3>
                <p className="text-gray-600">Share flashcard sets with study groups and track collective progress.</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <Sparkles className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Multiple Study Modes</h3>
                <p className="text-gray-600">Choose from flashcards, multiple choice, fill-in-the-blank, and free response formats.</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <TrendingUp className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Detailed Analytics</h3>
                <p className="text-gray-600">Understand your learning patterns with comprehensive progress reports and insights.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of students and professionals who&apos;ve supercharged their learning with FlashLearn AI.
          </p>
          <Link
            href="/auth/signup"
            className="bg-yellow-400 text-blue-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition-colors"
          >
            Start Your Free Account
          </Link>
        </div>
      </div>
    </div>
  );
};

// Main Component with Authentication Check
export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      {session ? <AuthenticatedHome session={session} /> : <UnauthenticatedHome />}
    </Suspense>
  );
}