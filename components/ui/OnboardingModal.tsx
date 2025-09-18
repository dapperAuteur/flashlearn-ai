'use client';

import { X, ArrowLeft, ArrowRight } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  highlightSelector?: string;
  position: 'center' | 'top' | 'bottom';
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: "Welcome to FlashLearn AI!",
    description: "Let's take a quick tour of your dashboard and show you how to get started.",
    position: 'center'
  },
  {
    title: "Create Flashcards",
    description: "Use the navigation bar to create flashcards manually or generate them with AI.",
    highlightSelector: 'nav',
    position: 'bottom'
  },
  {
    title: "Study & Progress",
    description: "Track your learning progress and use spaced repetition to improve retention.",
    highlightSelector: '[data-onboarding="stats"]',
    position: 'top'
  },
  {
    title: "Quick Actions",
    description: "Access frequently used features right from your dashboard.",
    highlightSelector: '[data-onboarding="actions"]',
    position: 'top'
  },
  {
    title: "Ready to Start!",
    description: "You're all set! Create your first flashcard set to begin learning.",
    position: 'center'
  }
];

interface OnboardingModalProps {
  isOpen: boolean;
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingModal({
  isOpen,
  currentStep,
  onNext,
  onPrevious,
  onComplete,
  onSkip,
}: OnboardingModalProps) {
  if (!isOpen) return null;

  const step = onboardingSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/50" />
      
      {/* Modal */}
      <div className={`relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 ${
        step.position === 'top' ? 'mt-8' : 
        step.position === 'bottom' ? 'mb-8' : ''
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500">
              Step {currentStep + 1} of {onboardingSteps.length}
            </span>
          </div>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {step.title}
          </h3>
          <p className="text-gray-600">
            {step.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div>
            {!isFirstStep && (
              <button
                onClick={onPrevious}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onSkip}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Skip Tour
            </button>
            
            {isLastStep ? (
              <button
                onClick={onComplete}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Get Started
              </button>
            ) : (
              <button
                onClick={onNext}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}