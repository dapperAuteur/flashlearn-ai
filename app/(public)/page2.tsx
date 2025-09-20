/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { Brain, Zap, Users, TrendingUp, Clock, Sparkles, BarChart3, BookOpen, Target } from "lucide-react";

// Shared Hero Component that adapts based on auth status
const AdaptiveHero = ({ isAuthenticated, session }: { isAuthenticated: boolean; session?: any }) => {
  if (isAuthenticated) {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Welcome back, {session?.user?.name || 'Learner'}!
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Your personalized learning dashboard is ready. Continue your journey to mastery with AI-powered spaced repetition.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/study"
                className="bg-yellow-400 text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
              >
                Continue Studying
              </Link>
              <Link
                href="/generate"
                className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Create New Cards
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Master Any Subject with
            <span className="block text-yellow-300">Smart Flashcards</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Stop wasting time creating study materials manually. Our AI transforms any content into personalized flashcards, while spaced repetition science ensures you remember everything.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-yellow-400 text-blue-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition-colors"
            >
              Get Started Free
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
  );
};

// Adaptive Stats/Benefits Section
const AdaptiveStatsSection = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  if (isAuthenticated) {
    return (
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
            Your Learning Progress
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">24</div>
              <div className="text-sm text-gray-600">Flashcard Sets</div>
            </div>
            
            <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">87%</div>
              <div className="text-sm text-gray-600">Average Accuracy</div>
            </div>
            
            <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
              <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">12</div>
              <div className="text-sm text-gray-600">Day Streak</div>
            </div>
            
            <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
              <div className="bg-yellow-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">156</div>
              <div className="text-sm text-gray-600">Cards Mastered</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-4">
          The Science Behind Better Learning
        </h2>
        <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          FlashLearn AI combines proven cognitive science with modern AI to create the most effective study experience possible.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">40% Better Retention</h3>
            <p className="text-gray-600">
              Spaced repetition shows you cards at scientifically optimal intervals, dramatically improving long-term memory retention compared to traditional studying.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">80% Time Savings</h3>
            <p className="text-gray-600">
              AI instantly converts PDFs, videos, and text into perfect flashcards. Spend your time learning, not formatting study materials.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Personalized Learning</h3>
            <p className="text-gray-600">
              Our AI adapts to your learning pace and identifies your weak spots, ensuring you focus on what needs the most attention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Adaptive Features/Actions Section
const AdaptiveFeaturesSection = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  if (isAuthenticated) {
    return (
      <div>
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
            What Would You Like to Do?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/generate" className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="bg-blue-600 rounded-lg w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate New Cards</h3>
              <p className="text-gray-600 text-sm">Upload PDFs, paste text, or share YouTube links to create flashcards instantly with AI.</p>
            </Link>
            
            <Link href="/study" className="group bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="bg-green-600 rounded-lg w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Study Session</h3>
              <p className="text-gray-600 text-sm">Review your flashcards with our intelligent spaced repetition algorithm.</p>
            </Link>
            
            <Link href="/dashboard" className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="bg-purple-600 rounded-lg w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">View Analytics</h3>
              <p className="text-gray-600 text-sm">Track your progress and identify areas for improvement with detailed insights.</p>
            </Link>
            
            <Link href="/teams" className="group bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="bg-orange-600 rounded-lg w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Collaboration</h3>
              <p className="text-gray-600 text-sm">Share flashcard sets with your study group and track collective progress.</p>
            </Link>
            
            <Link href="/library" className="group bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="bg-teal-600 rounded-lg w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Library</h3>
              <p className="text-gray-600 text-sm">Explore public flashcard sets and discover new learning materials.</p>
            </Link>
            
            <Link href="/settings" className="group bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
             Settings
              <div className="bg-gray-600 rounded-lg w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6 text-white" />
              </div>

            </Link>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Learning Goals</h3>
              <p className="text-gray-600 text-sm">Set up your learning objectives and customize your study experience.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
          Powerful Features for Effective Learning
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Content Generation</h3>
                <p className="text-gray-600">Upload PDFs, paste YouTube links, or share any text. Our AI instantly creates perfectly formatted flashcards from your content.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 rounded-lg p-2 flex-shrink-0">
                <Brain className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Spaced Repetition Algorithm</h3>
                <p className="text-gray-600">Science-backed scheduling shows you cards at optimal intervals to maximize long-term retention and minimize study time.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-purple-100 rounded-lg p-2 flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Progress Analytics</h3>
                <p className="text-gray-600">Detailed insights into your learning patterns, accuracy rates, and improvement over time help you optimize your study strategy.</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 rounded-lg p-2 flex-shrink-0">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Team Collaboration</h3>
                <p className="text-gray-600">Share flashcard sets with study groups, track team progress, and collaborate on learning materials with classmates or colleagues.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-teal-100 rounded-lg p-2 flex-shrink-0">
                <Zap className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Multiple Study Modes</h3>
                <p className="text-gray-600">Choose from flashcards, multiple choice, fill-in-the-blank, and free response formats to keep your study sessions engaging.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-yellow-100 rounded-lg p-2 flex-shrink-0">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Smart Notifications</h3>
                <p className="text-gray-600">Get reminded when it&apos;s the perfect time to review specific cards for maximum retention, helping you maintain consistent study habits.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default async function Home() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session;

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <div className="min-h-screen bg-white">
        <AdaptiveHero isAuthenticated={isAuthenticated} session={session} />
        <AdaptiveStatsSection isAuthenticated={isAuthenticated} />
        <AdaptiveFeaturesSection isAuthenticated={isAuthenticated} />
        
        {/* Common CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            {isAuthenticated ? (
              <>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Ready to Continue Learning?
                </h2>
                <p className="text-lg text-blue-100 mb-6">
                  Your flashcards are waiting. Let&apos;s make today a learning victory.
                </p>
                <Link
                  href="/study"
                  className="bg-yellow-400 text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
                >
                  Start Studying Now
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Ready to Transform Your Learning?
                </h2>
                <p className="text-lg text-blue-100 mb-6">
                  Join thousands who&apos;ve accelerated their learning with AI-powered flashcards.
                </p>
                <Link
                  href="/auth/signup"
                  className="bg-yellow-400 text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
                >
                  Start Free Today
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </Suspense>
  );
}