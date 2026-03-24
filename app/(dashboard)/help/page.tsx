'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  BookOpenIcon,
  AcademicCapIcon,
  WifiIcon,
  BoltIcon,
  CodeBracketIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSection {
  title: string;
  icon: React.ElementType;
  items: FaqItem[];
}

const faqSections: FaqSection[] = [
  {
    title: 'Getting Started',
    icon: BookOpenIcon,
    items: [
      {
        question: 'How do I create flashcards?',
        answer:
          'Go to the Generate page and enter a topic, paste text, or upload a PDF, image, YouTube URL, or audio file. Click "Generate with AI" and our AI will create flashcards for you. You can also upload a CSV file with your own terms and definitions.',
      },
      {
        question: 'How do I study my flashcards?',
        answer:
          'Go to My Flashcards, select a set, and choose a study mode: Classic (flip cards), Multiple Choice, or Type Your Answer. The spaced repetition system will schedule reviews based on your performance.',
      },
      {
        question: 'What is spaced repetition?',
        answer:
          'Spaced repetition (SM-2 algorithm) schedules card reviews at increasing intervals based on how well you know each card. Cards you struggle with appear more frequently, while well-known cards are shown less often. This optimizes long-term retention.',
      },
    ],
  },
  {
    title: 'Study Modes',
    icon: AcademicCapIcon,
    items: [
      {
        question: 'What study modes are available?',
        answer:
          'Three modes: Classic (flip cards and self-report), Multiple Choice (AI generates options), and Type Your Answer (AI validates your response). Each mode tracks your accuracy and time.',
      },
      {
        question: 'How does confidence rating work?',
        answer:
          'After answering, you can rate your confidence level. This feeds into the spaced repetition algorithm to better schedule reviews. Cards where you were correct but uncertain will appear sooner.',
      },
      {
        question: 'How does Versus mode work?',
        answer:
          'Create a challenge from any flashcard set, share the code with friends, and compete. Scoring combines accuracy (40%), speed (25%), confidence (20%), and streak (15%). Check the leaderboard to see rankings.',
      },
    ],
  },
  {
    title: 'Offline Study',
    icon: WifiIcon,
    items: [
      {
        question: 'Can I study without internet?',
        answer:
          'Yes! FlashLearn AI works offline. Your flashcard sets are cached locally and study progress is saved to your device. When you reconnect, everything syncs automatically.',
      },
      {
        question: 'How does offline sync work?',
        answer:
          'Study results are stored in IndexedDB when offline. When internet returns, the sync service automatically pushes your progress to the server. You will see a sync indicator at the bottom of the screen.',
      },
    ],
  },
  {
    title: 'AI Generation',
    icon: BoltIcon,
    items: [
      {
        question: 'What content sources can I use?',
        answer:
          'Text/topics, PDF documents, YouTube videos (via transcript), audio files (transcribed), images (via OCR), and CSV files with pre-made terms.',
      },
      {
        question: 'How many cards are generated?',
        answer:
          'By default, 5-20 cards are generated based on the topic complexity. Admin users can specify an exact quantity (1-50 cards) using the card quantity selector.',
      },
      {
        question: 'Are there generation limits?',
        answer:
          'Free users get 3 AI-generated sets per month. Pro subscribers get unlimited generations. Check the Pricing page for details.',
      },
    ],
  },
  {
    title: 'Developer API',
    icon: CodeBracketIcon,
    items: [
      {
        question: 'How do I access the API?',
        answer:
          'Go to the Developer portal to create API keys. The API offers 23 endpoints for flashcard generation, set management, study sessions, and versus challenges. See the API docs for details.',
      },
      {
        question: 'What are the API pricing tiers?',
        answer:
          'Free: 100 generations/month, 1,000 API calls. Developer ($19/mo): 5,000 generations, 50,000 calls. Pro ($49/mo): 25,000 generations, 250,000 calls. Enterprise: custom pricing.',
      },
    ],
  },
  {
    title: 'Account & Settings',
    icon: UserCircleIcon,
    items: [
      {
        question: 'How do I change my password?',
        answer:
          'Go to Settings to update your password. You can also use the "Forgot Password" link on the sign-in page to receive a password reset email.',
      },
      {
        question: 'What subscription plans are available?',
        answer:
          'Free (3 AI sets/month, classic study), Monthly Pro ($10/month, unlimited everything), and Lifetime Learner ($100 one-time, all Pro features forever).',
      },
    ],
  },
];

function FaqAccordion({ section }: { section: FaqSection }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const Icon = section.icon;

  return (
    <section aria-labelledby={`faq-${section.title.toLowerCase().replace(/\s+/g, '-')}`} className="mb-8">
      <h2
        id={`faq-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
        className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4"
      >
        <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
        {section.title}
      </h2>
      <div className="space-y-2">
        {section.items.map((item, index) => {
          const isOpen = openIndex === index;
          const itemId = `faq-${section.title.toLowerCase().replace(/\s+/g, '-')}-${index}`;
          return (
            <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={`${itemId}-content`}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <span>{item.question}</span>
                {isOpen ? (
                  <ChevronUpIcon className="h-4 w-4 text-gray-600 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-gray-600 flex-shrink-0" aria-hidden="true" />
                )}
              </button>
              {isOpen && (
                <div id={`${itemId}-content`} role="region" aria-labelledby={itemId} className="px-4 pb-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <main aria-label="Help and FAQ" className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Help & FAQ</h1>
            <p className="text-gray-700">
              Find answers to common questions about FlashLearn AI.
            </p>
          </div>

          {faqSections.map((section) => (
            <FaqAccordion key={section.title} section={section} />
          ))}

          <div className="mt-10 bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Need more help?</h2>
            <p className="text-sm text-gray-700 mb-4">
              Use the feedback widget in the bottom-right corner to start a conversation with our team, or check out our developer documentation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/docs/api/getting-started"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                API Documentation
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
