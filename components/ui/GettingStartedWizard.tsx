'use client';

import { useCallback, useEffect, useState } from 'react';
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
    title: 'Complete your profile',
    description: 'Add a username, bio, and profile picture on your profile page.',
    icon: User,
    href: '/profile',
    color: 'bg-blue-500',
  },
  {
    id: 'first-set',
    title: 'Create your first set',
    description: 'Generate flashcards from text, a PDF, a YouTube video, or your own notes.',
    icon: BookOpen,
    href: '/generate',
    color: 'bg-purple-500',
  },
  {
    id: 'first-study',
    title: 'Start studying',
    description: 'Study your flashcards with spaced repetition so they stick.',
    icon: GraduationCap,
    href: '/study',
    color: 'bg-green-500',
  },
  {
    id: 'versus',
    title: 'Try Versus mode',
    description: 'Challenge a friend to a head-to-head flashcard match.',
    icon: Swords,
    href: '/versus',
    color: 'bg-orange-500',
  },
];

/**
 * The dashboard's first-run checklist.
 *
 * Whether it shows is answered by the account, not by this component's state.
 * `onboardingCompleted` comes back from GET /api/user/profile, and dismissing
 * writes it back with PATCH, so a dismissal survives a reload and follows the
 * user to their next device. Until that answer arrives the component renders
 * nothing, because a card that appears and then vanishes reads as a glitch.
 *
 * The per-step ticks are deliberately session-local. They are a scratch pad for
 * the current visit, not a record of what the account has done.
 */
export default function GettingStartedWizard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) {
      // Signed out, or the session is still loading. Nothing to ask about yet.
      setResolved(status === 'unauthenticated');
      return;
    }

    let active = true;

    const readOnboardingState = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (!active) return;
        if (!res.ok) {
          // Unknown beats guessing. Staying hidden avoids showing a checklist
          // to someone who already dismissed it.
          setResolved(true);
          return;
        }
        const data = await res.json();
        setVisible(data?.user?.onboardingCompleted !== true);
      } catch {
        // Offline or the request failed. Same reasoning as above.
      } finally {
        if (active) setResolved(true);
      }
    };

    readOnboardingState();

    return () => {
      active = false;
    };
  }, [status, session?.user]);

  const handleDismiss = useCallback(async () => {
    setVisible(false);
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingCompleted: true }),
      });
    } catch {
      // The card is already gone for this visit. If the write failed the card
      // comes back on the next load, which is the safer of the two mistakes.
    }
  }, []);

  if (!resolved || !visible) return null;

  const handleStepClick = (step: Step) => {
    router.push(step.href);
  };

  const handleMarkComplete = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
  };

  const completedCount = completedSteps.size;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6"
      role="region"
      aria-label="Getting started guide"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Getting started</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Four steps to get the most out of FlashLearn AI.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-700 p-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Dismiss the getting started guide"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Getting started progress"
        />
      </div>
      <p className="text-xs text-gray-600 mb-6" aria-live="polite">
        {completedCount} of {steps.length} steps ticked off
      </p>

      <ul className="space-y-3 list-none p-0 m-0">
        {steps.map(step => {
          const isCompleted = completedSteps.has(step.id);
          const Icon = step.icon;

          return (
            <li
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                isCompleted
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                  isCompleted ? 'bg-green-600' : step.color
                }`}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 text-white" aria-hidden="true" />
                ) : (
                  <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                )}
              </div>

              <button
                type="button"
                onClick={() => handleStepClick(step)}
                className="flex-1 min-w-0 text-left rounded focus:outline-none focus:ring-2 focus:ring-blue-500 py-1"
              >
                <span
                  className={`block text-sm font-medium ${
                    isCompleted ? 'text-green-800 line-through' : 'text-gray-900'
                  }`}
                >
                  {step.title}
                  {isCompleted ? <span className="sr-only"> (ticked off)</span> : null}
                </span>
                <span className="block text-xs text-gray-600">{step.description}</span>
              </button>

              {isCompleted ? null : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMarkComplete(step.id)}
                    className="text-xs text-gray-600 hover:text-green-700 px-2 py-1 rounded min-h-[44px] inline-flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Skip
                    <span className="sr-only"> {step.title}</span>
                  </button>
                  <ArrowRight className="h-4 w-4 text-gray-500" aria-hidden="true" />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {completedCount === steps.length && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg text-center">
          <p className="text-sm font-medium text-green-800">
            That is all four. You are ready to learn.
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-green-700 hover:text-green-800 underline mt-1 min-h-[44px] inline-flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            Hide this guide for good
          </button>
        </div>
      )}
    </div>
  );
}
