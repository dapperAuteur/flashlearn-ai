/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  BookOpen, 
  Play, 
  ArrowRight, 
  CheckCircle,
  Users,
  Target
} from "lucide-react";

// Modern Hero Section with Conditional Content
const ModernHero = ({ isAuthenticated, session }: { isAuthenticated: boolean; session?: any }) => {
  if (isAuthenticated) {
    return (
      <div className="relative bg-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* Welcome Message */}
            <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <CheckCircle className="h-4 w-4" />
              <span>Welcome back, {session?.user?.name || 'Learner'}!</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Continue Your
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                Learning Journey
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Your personalized study dashboard is ready. Pick up where you left off and master new concepts with AI-powered spaced repetition.
            </p>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <Link href="/study" className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Play className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Study Now</h3>
                <p className="text-sm text-gray-600 mb-3">Review 8 cards due for optimal retention</p>
                <div className="text-blue-600 text-sm font-medium group-hover:text-blue-700">Start session →</div>
              </Link>
              
              <Link href="/generate" className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-purple-200 transition-all duration-300">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Create Cards</h3>
                <p className="text-sm text-gray-600 mb-3">Generate from PDF, text, or YouTube</p>
                <div className="text-purple-600 text-sm font-medium group-hover:text-purple-700">Generate now →</div>
              </Link>
              
              <Link href="/dashboard" className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-green-200 transition-all duration-300">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">View Progress</h3>
                <p className="text-sm text-gray-600 mb-3">87% average accuracy this week</p>
                <div className="text-green-600 text-sm font-medium group-hover:text-green-700">See details →</div>
              </Link>
            </div>
            
            {/* Study Streak */}
            <div className="inline-flex items-center space-x-3 bg-yellow-50 border border-yellow-200 rounded-full px-6 py-3">
              <Target className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-800 font-medium">12-day study streak! Keep it up!</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Learning Revolution</span>
          </div>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8">
            Learn Faster with
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent block mt-2">
              Smart Flashcards
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Transform any content into AI-generated flashcards. Our spaced repetition algorithm ensures you remember what you learn, saving you hours of study time.
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/auth/signup"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Start Learning Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/generate"
              className="inline-flex items-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
            >
              Try AI Generator
              <Play className="ml-2 h-5 w-5" />
            </Link>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 mb-16">
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full border-2 border-white" />
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-full border-2 border-white" />
                <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full border-2 border-white" />
              </div>
              <span>2,000+ active learners</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <span>4.9/5 average rating</span>
            <div className="w-px h-4 bg-gray-300" />
            <span>40% better retention rate</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Benefits Section
const BenefitsSection = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  type ColorVariant = "blue" | "purple" | "green";
  
  const benefits = isAuthenticated ? [
    {
      icon: Brain,
      title: "Optimized Review Schedule",
      description: "Your next study session is personalized based on your performance and memory strength for each card.",
      color: "blue" as ColorVariant
    },
    {
      icon: Sparkles,
      title: "Instant AI Generation",
      description: "Upload any PDF, paste YouTube links, or share text. New flashcards appear in seconds, not hours.",
      color: "purple" as ColorVariant
    },
    {
      icon: TrendingUp,
      title: "Progress Insights",
      description: "See exactly which topics you've mastered and which need more attention with detailed analytics.",
      color: "green" as ColorVariant
    }
  ] : [
    {
      icon: Clock,
      title: "Save 80% of Study Time",
      description: "Stop manually creating flashcards. Our AI transforms any content into perfectly formatted study materials instantly.",
      color: "blue" as ColorVariant
    },
    {
      icon: Brain,
      title: "Remember 40% More",
      description: "Spaced repetition science ensures you review cards at the optimal moment, dramatically improving retention.",
      color: "purple" as ColorVariant
    },
    {
      icon: Users,
      title: "Learn Together",
      description: "Share flashcard sets with study groups and track collective progress for collaborative learning.",
      color: "green" as ColorVariant
    }
  ];

  const colorMap: Record<ColorVariant, string> = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600"
  };

  return (
    <div className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {isAuthenticated ? "Your Learning Advantage" : "Why FlashLearn AI Works"}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isAuthenticated 
              ? "Everything you need to maximize your study effectiveness is right at your fingertips."
              : "Combining proven cognitive science with cutting-edge AI to create the most effective study experience."
            }
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300">
              <div className={`bg-gradient-to-br ${colorMap[benefit.color]} rounded-xl w-14 h-14 flex items-center justify-center mb-6`}>
                <benefit.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{benefit.title}</h3>
              <p className="text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Features Showcase
const FeaturesShowcase = () => {
  return (
    <div className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Excel
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From AI-powered content generation to intelligent study scheduling, every feature is designed to maximize your learning efficiency.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Features List */}
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Content Generation</h3>
                <p className="text-gray-700">Upload PDFs, YouTube videos, or any text. Our AI creates perfectly formatted flashcards in seconds.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 rounded-lg p-2 flex-shrink-0">
                <Brain className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Spaced Repetition Algorithm</h3>
                <p className="text-gray-700">Science-backed scheduling shows you cards at optimal intervals for maximum retention.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-purple-100 rounded-lg p-2 flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Progress Analytics</h3>
                <p className="text-gray-700">Track your learning with detailed insights, accuracy rates, and performance trends.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 rounded-lg p-2 flex-shrink-0">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Team Collaboration</h3>
                <p className="text-gray-700">Share flashcard sets with study groups and track team progress together.</p>
              </div>
            </div>
          </div>
          
          {/* Right Column - Visual Element */}
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 shadow-lg">
              <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Biology Chapter 7</span>
                </div>
                <p className="text-gray-600 text-sm">24 cards • 85% accuracy • Due for review</p>
                <div className="mt-3 bg-blue-50 rounded-lg p-2">
                  <p className="text-xs text-blue-800">Next review: Today at 3:00 PM</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-gray-900">Spanish Vocabulary</span>
                </div>
                <p className="text-gray-600 text-sm">12 cards • Generated from YouTube video</p>
                <div className="mt-3 bg-green-50 rounded-lg p-2">
                  <p className="text-xs text-green-800">Mastered: 8/12 cards</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Final CTA Section
const FinalCTA = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  if (isAuthenticated) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Your Next Learning Victory Awaits
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            You&apos;re on a 12-day streak! Keep the momentum going with your personalized study session.
          </p>
          <Link
            href="/study"
            className="inline-flex items-center bg-yellow-400 text-blue-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-300 transition-colors shadow-lg"
          >
            Continue Studying
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Learn Smarter?
        </h2>
        <p className="text-xl text-blue-100 mb-8">
          Join thousands of learners who&apos;ve transformed their study habits with AI-powered flashcards.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signup"
            className="bg-yellow-400 text-blue-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-300 transition-colors shadow-lg"
          >
            Start Your Free Account
          </Link>
          <Link
            href="/generate"
            className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors"
          >
            Try AI Generator First
          </Link>
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
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your personalized experience...</p>
        </div>
      </div>
    }>
      <div className="min-h-screen">
        <ModernHero isAuthenticated={isAuthenticated} session={session} />
        <BenefitsSection isAuthenticated={isAuthenticated} />
        {!isAuthenticated && <FeaturesShowcase />}
        <FinalCTA isAuthenticated={isAuthenticated} />
      </div>
    </Suspense>
  );
}