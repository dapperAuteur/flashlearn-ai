/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  Play, 
  ArrowRight, 
  CheckCircle,
  Users,
  Target,
  Zap
} from "lucide-react";
import { ABTestTrigger } from "@/components/ab-test-dashboard";

// A/B Test Analytics Tracking
interface ABTestEvent {
  variant: 'A' | 'B' | 'C';
  event: 'view' | 'signup_click' | 'signin_click' | 'generate_click' | 'study_click' | 'dashboard_click';
  timestamp: number;
  userId?: string;
  sessionId: string;
}

const trackEvent = async (event: Omit<ABTestEvent, 'timestamp' | 'sessionId'>) => {
  const sessionId = localStorage.getItem('ab-session-id') || `session_${Date.now()}_${Math.random()}`;
  localStorage.setItem('ab-session-id', sessionId);

  const eventData: ABTestEvent = {
    ...event,
    timestamp: Date.now(),
    sessionId
  };

  // Store events locally for immediate dashboard access
  const events = JSON.parse(localStorage.getItem('ab-test-events') || '[]');
  events.push(eventData);
  localStorage.setItem('ab-test-events', JSON.stringify(events));

  console.log('AB Test Event:', eventData);

  // Send to database (don't block UI)
  try {
    await fetch('/api/analytics/ab-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
  } catch (error) {
    console.warn('Failed to save analytics to database:', error);
  }
};

const getVariant = (): 'A' | 'B' | 'C' => {
  if (typeof window === 'undefined') return 'A';
  
  let variant = localStorage.getItem('ab-test-variant') as 'A' | 'B' | 'C' | null;
  
  if (!variant) {
    const variants: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
    variant = variants[Math.floor(Math.random() * variants.length)];
    localStorage.setItem('ab-test-variant', variant);
  }
  
  return variant;
};

// Option A: Traditional Landing Page vs Dashboard
const VariantA = ({ isAuthenticated, userName }: { isAuthenticated: boolean; userName?: string | null }) => {
  useEffect(() => {
    trackEvent({ variant: 'A', event: 'view' });
  }, []);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {userName || 'Learner'}!
            </h1>
            <p className="text-gray-600 mt-2">Ready to continue your learning journey?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link 
              href="/generate" 
              onClick={() => trackEvent({ variant: 'A', event: 'generate_click' })}
              className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Generate Flashcards</h3>
                  <p className="text-sm text-gray-600">Create from text, PDF, or YouTube</p>
                </div>
              </div>
            </Link>
            
            <Link 
              href="/study" 
              onClick={() => trackEvent({ variant: 'A', event: 'study_click' })}
              className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <Brain className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Study Session</h3>
                  <p className="text-sm text-gray-600">Review your flashcards</p>
                </div>
              </div>
            </Link>
            
            <Link 
              href="/dashboard" 
              onClick={() => trackEvent({ variant: 'A', event: 'dashboard_click' })}
              className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">View Progress</h3>
                  <p className="text-sm text-gray-600">Track your learning stats</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
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
                onClick={() => trackEvent({ variant: 'A', event: 'signup_click' })}
                className="bg-yellow-400 text-blue-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition-colors"
              >
                Start Learning Free
              </Link>
              <Link
                href="/generate"
                onClick={() => trackEvent({ variant: 'A', event: 'generate_click' })}
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors"
              >
                Try AI Generator
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why FlashLearn AI Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Spaced Repetition Science</h3>
              <p className="text-gray-600">
                Our algorithm shows you cards just before you&apos;re about to forget them, increasing retention by up to 40%.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Content Creation</h3>
              <p className="text-gray-600">
                Upload PDFs, paste text, or share YouTube videos. Our AI instantly transforms content into flashcards.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Progress Tracking</h3>
              <p className="text-gray-600">
                See your improvement over time with detailed analytics and identify areas for focused study.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Option B: Adaptive Content
const VariantB = ({ isAuthenticated, userName }: { isAuthenticated: boolean; userName?: string | null }) => {
  useEffect(() => {
    trackEvent({ variant: 'B', event: 'view' });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {isAuthenticated ? `Welcome back, ${userName || 'Learner'}!` : 'Master Any Subject with'}
              {!isAuthenticated && <span className="block text-yellow-300">Smart Flashcards</span>}
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              {isAuthenticated 
                ? "Your personalized learning dashboard is ready. Continue your journey to mastery."
                : "Stop wasting time creating study materials manually. Our AI transforms any content into personalized flashcards."
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/study"
                    onClick={() => trackEvent({ variant: 'B', event: 'study_click' })}
                    className="bg-yellow-400 text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
                  >
                    Continue Studying
                  </Link>
                  <Link
                    href="/generate"
                    onClick={() => trackEvent({ variant: 'B', event: 'generate_click' })}
                    className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    Create New Cards
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signup"
                    onClick={() => trackEvent({ variant: 'B', event: 'signup_click' })}
                    className="bg-yellow-400 text-blue-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition-colors"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    href="/generate"
                    onClick={() => trackEvent({ variant: 'B', event: 'generate_click' })}
                    className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    Try AI Generator
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
            {isAuthenticated ? "Your Learning Progress" : "The Science Behind Better Learning"}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isAuthenticated ? (
              <>
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <div className="text-2xl font-bold text-gray-900 mb-1">24</div>
                  <div className="text-sm text-gray-600">Flashcard Sets</div>
                </div>
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <div className="text-2xl font-bold text-gray-900 mb-1">87%</div>
                  <div className="text-sm text-gray-600">Average Accuracy</div>
                </div>
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <div className="text-2xl font-bold text-gray-900 mb-1">12</div>
                  <div className="text-sm text-gray-600">Day Streak</div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">40% Better Retention</h3>
                  <p className="text-gray-600 text-sm">Spaced repetition dramatically improves memory retention.</p>
                </div>
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <Clock className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">80% Time Savings</h3>
                  <p className="text-gray-600 text-sm">AI creates flashcards instantly from any content.</p>
                </div>
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Personalized Learning</h3>
                  <p className="text-gray-600 text-sm">AI adapts to your pace and identifies weak spots.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Option C: Modern Hero
const VariantC = ({ isAuthenticated, userName }: { isAuthenticated: boolean; userName?: string | null }) => {
  useEffect(() => {
    trackEvent({ variant: 'C', event: 'view' });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            {isAuthenticated && (
              <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <CheckCircle className="h-4 w-4" />
                <span>Welcome back, {userName || 'Learner'}!</span>
              </div>
            )}

            {!isAuthenticated && (
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered Learning Revolution</span>
              </div>
            )}
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8">
              {isAuthenticated ? (
                <>
                  Continue Your
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                    Learning Journey
                  </span>
                </>
              ) : (
                <>
                  Learn Faster with
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent block mt-2">
                    Smart Flashcards
                  </span>
                </>
              )}
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
              {isAuthenticated 
                ? "Your personalized study dashboard is ready. Pick up where you left off and master new concepts."
                : "Transform any content into AI-generated flashcards. Our spaced repetition algorithm ensures you remember what you learn."
              }
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/study"
                    onClick={() => trackEvent({ variant: 'C', event: 'study_click' })}
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Continue Studying
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link
                    href="/generate"
                    onClick={() => trackEvent({ variant: 'C', event: 'generate_click' })}
                    className="inline-flex items-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
                  >
                    Create New Cards
                    <Play className="ml-2 h-5 w-5" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signup"
                    onClick={() => trackEvent({ variant: 'C', event: 'signup_click' })}
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Start Learning Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link
                    href="/generate"
                    onClick={() => trackEvent({ variant: 'C', event: 'generate_click' })}
                    className="inline-flex items-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
                  >
                    Try AI Generator
                    <Play className="ml-2 h-5 w-5" />
                  </Link>
                </>
              )}
            </div>

            {!isAuthenticated && (
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
interface ABTestClientWrapperProps {
  isAuthenticated: boolean;
  userName: string | null;
}

const ABTestClientWrapper: React.FC<ABTestClientWrapperProps> = ({ 
  isAuthenticated, 
  userName 
}) => {
  const [variant, setVariant] = useState<'A' | 'B' | 'C'>('A');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setVariant(getVariant());
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your personalized experience...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {variant === 'A' && <VariantA isAuthenticated={isAuthenticated} userName={userName} />}
      {variant === 'B' && <VariantB isAuthenticated={isAuthenticated} userName={userName} />}
      {variant === 'C' && <VariantC isAuthenticated={isAuthenticated} userName={userName} />}
      <ABTestTrigger />
    </>
  );
};

export default ABTestClientWrapper;