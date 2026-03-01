'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  BoltIcon,
  SparklesIcon,
  ShareIcon,
  TrophyIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

const scoringComponents = [
  {
    name: 'Accuracy',
    weight: '40%',
    points: '0-400',
    color: 'bg-blue-500',
    description: 'Percentage of cards you answer correctly. This carries the most weight because knowing the material is what matters most.',
  },
  {
    name: 'Speed',
    weight: '25%',
    points: '0-250',
    color: 'bg-green-500',
    description: 'How quickly you answer each card on average. Faster recall means stronger knowledge, but accuracy still matters more.',
  },
  {
    name: 'Confidence',
    weight: '20%',
    points: '0-200',
    color: 'bg-purple-500',
    description: 'How well your confidence rating matches your actual performance. High confidence + correct = great. High confidence + wrong = penalty.',
  },
  {
    name: 'Streak',
    weight: '15%',
    points: '0-150',
    color: 'bg-amber-500',
    description: 'Your longest run of consecutive correct answers relative to the total cards. Rewards consistency.',
  },
];

const faqs = [
  {
    q: 'Can I practice the set before competing?',
    a: 'Yes! Study any set as many times as you want before creating or joining a challenge. The challenge itself is a one-attempt deal, so prepare well.',
  },
  {
    q: 'What happens if I close the browser during a challenge?',
    a: 'Your progress is lost for that challenge. Each challenge allows only one attempt, so make sure you have time to finish before starting.',
  },
  {
    q: 'Can I challenge someone who doesn\'t have an account?',
    a: 'They\'ll need to create a free account to join. When they click the challenge link, they\'ll be prompted to sign up first.',
  },
  {
    q: 'How is the winner determined with more than 2 players?',
    a: 'All players are ranked by composite score. Ties are broken by accuracy, then speed. Everyone gets a rank, from 1st place down.',
  },
  {
    q: 'Does challenge study count toward my spaced repetition schedule?',
    a: 'Yes! Every card you study during a challenge updates your review schedule just like a regular study session.',
  },
  {
    q: 'What\'s the difference between free and Pro?',
    a: 'Free users can create 3 challenges per day with up to 5 players using classic mode. Pro users get unlimited challenges, up to 50 players, and access to multiple choice mode.',
  },
];

export default function HowItWorksPage() {
  const { data: session } = useSession();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
            <BoltIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Versus Mode</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">
            Challenge Your Friends to Learn
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Study the same flashcards, compete on score. The best way to prove you
            actually know your stuff.
          </p>

          {/* Video placeholder */}
          <div className="max-w-2xl mx-auto bg-black/20 rounded-2xl aspect-video flex items-center justify-center border border-white/10">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <PlayIcon className="h-8 w-8 text-white ml-1" />
              </div>
              <p className="text-sm text-blue-200">Video tutorial coming soon</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* How It Works - 3 Steps */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Pick a Set & Create
              </h3>
              <p className="text-sm text-gray-600">
                Choose any flashcard set and create a challenge. Pick your study mode,
                then set it to private, classroom, or public.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Share the Code
              </h3>
              <p className="text-sm text-gray-600">
                Get a unique code like VS-A3K9M2. Text it, post it, or drop it in
                your class chat. Anyone with the code can join.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Compete & Compare
              </h3>
              <p className="text-sm text-gray-600">
                Study the exact same cards in the exact same order. When everyone
                finishes, see who scored highest.
              </p>
            </div>
          </div>
        </div>

        {/* Scoring */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-4">
            Scoring System
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-xl mx-auto">
            Your score is out of 1,000 points, combining four dimensions of performance.
          </p>
          <div className="space-y-4">
            {scoringComponents.map((component) => (
              <div key={component.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${component.color}`} />
                    <h3 className="font-semibold text-gray-900">{component.name}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">{component.weight}</span>
                    <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {component.points}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{component.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Challenge Types */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
            Challenge Types
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <UserGroupIcon className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Direct</h3>
              <p className="text-sm text-gray-600">
                1v1 or small group. Share a private code with specific friends.
                Up to 10 players.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <AcademicCapIcon className="h-8 w-8 text-green-500 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Classroom</h3>
              <p className="text-sm text-gray-600">
                Teachers create challenges for their class. All students see it
                in their Versus hub. Up to 30 players.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <GlobeAltIcon className="h-8 w-8 text-purple-500 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Public</h3>
              <p className="text-sm text-gray-600">
                Open to anyone. Discoverable in the Open Challenges feed.
                Up to 50 players.
              </p>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
            Rules
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <ul className="space-y-4">
              {[
                { icon: ShieldCheckIcon, text: 'All players study the same cards in the same order - a level playing field.' },
                { icon: SparklesIcon, text: 'You get one attempt per challenge. No restarts.' },
                { icon: TrophyIcon, text: 'Rate your confidence honestly - it directly affects your score.' },
                { icon: ShareIcon, text: 'Challenges expire after 24 hours (free) or 72 hours (Pro).' },
                { icon: UserGroupIcon, text: 'If time runs out, only completed players are ranked. Incomplete players are marked "Did Not Finish."' },
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <rule.icon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{rule.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-medium text-gray-900 pr-4">{faq.q}</span>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-gray-600">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 sm:p-12 border border-blue-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Ready to Compete?
          </h2>
          <p className="text-gray-600 mb-6">
            Create your first challenge and see how you stack up.
          </p>
          <Link
            href={session ? '/versus/create' : '/auth/signup'}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <BoltIcon className="h-5 w-5 mr-2" />
            {session ? 'Create Your First Challenge' : 'Sign Up & Start Competing'}
          </Link>
        </div>
      </div>
    </div>
  );
}
