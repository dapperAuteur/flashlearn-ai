'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { User, BookOpen, GraduationCap, Swords, Check, X, ArrowRight } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

const steps: Step[] = [
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Add a username, bio, and profile picture to personalize your experience.',
    icon: User,
    href: '/settings',
    color: 'bg-blue-500',
  },
  {
    id: 'first-set',
    title: 'Create Your First Set',
    description: 'Generate flashcards from text, PDF, YouTube, or any content with AI.',
    icon: BookOpen,
    href: '/generate',
    color: 'bg-purple-500',
  },
  {
    id: 'first-study',
    title: 'Start Studying',
    description: 'Study your flashcards with spaced repetition for better retention.',
    icon: GraduationCap,
    href: '/study',
    color: 'bg-green-500',
  },
  {
    id: 'versus',
    title: 'Try Versus Mode',
    description: 'Challenge friends to a head-to-head flashcard battle.',
    icon: Swords,
    href: '/versus',
    color: 'bg-orange-500',
  },
];

export default function GettingStartedWizard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  if (dismissed || !session) return null;

  const handleStepClick = (step: Step) => {
    router.push(step.href);
  };

  const handleMarkComplete = (stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
  };

  const handleDismiss = async () => {
    setDismissed(true);
    // Mark onboarding complete
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingCompleted: true }),
      });
    } catch {
      // Silently fail
    }
  };

  const progress = (completedSteps.size / steps.length) * 100;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6" role="region" aria-label="Getting started guide">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
          <p className="text-sm text-gray-500 mt-0.5">Complete these steps to get the most out of FlashLearn AI</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-500 p-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          aria-label="Dismiss getting started guide"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${completedSteps.size} of ${steps.length} steps completed`}
        />
      </div>

      <div className="space-y-3">
        {steps.map(step => {
          const isCompleted = completedSteps.has(step.id);
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                isCompleted
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
              }`}
              onClick={() => !isCompleted && handleStepClick(step)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isCompleted) handleStepClick(step); }}
              aria-label={`${step.title}${isCompleted ? ' (completed)' : ''}`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                isCompleted ? 'bg-green-500' : step.color
              }`}>
                {isCompleted ? (
                  <Check className="h-5 w-5 text-white" aria-hidden="true" />
                ) : (
                  <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isCompleted ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {!isCompleted ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => handleMarkComplete(step.id, e)}
                    className="text-xs text-gray-400 hover:text-green-600 px-2 py-1 rounded min-h-[44px] inline-flex items-center"
                    aria-label={`Mark "${step.title}" as complete`}
                  >
                    Skip
                  </button>
                  <ArrowRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {completedSteps.size === steps.length && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg text-center">
          <p className="text-sm font-medium text-green-700">All done! You&apos;re ready to learn. 🎉</p>
          <button
            onClick={handleDismiss}
            className="text-xs text-green-600 hover:text-green-700 mt-1 min-h-[44px] inline-flex items-center"
          >
            Dismiss this guide
          </button>
        </div>
      )}
    </div>
  );
}
