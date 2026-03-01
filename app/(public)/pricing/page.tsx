'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CheckIcon,
  RocketLaunchIcon,
  StarIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

const tiers = [
  {
    id: 'monthly',
    name: 'Monthly Pro',
    price: '$10',
    period: '/month',
    description: 'Everything you need to learn faster',
    icon: RocketLaunchIcon,
    features: [
      'Unlimited AI-generated sets',
      'Unlimited versus mode challenges',
      'Advanced spaced repetition scheduling',
      'Generate from PDF, YouTube, audio & images',
      'All study modes (classic, multiple choice, typed)',
      'AI-validated answers',
      'Full analytics & progress tracking',
      'CSV import',
      'Offline study support',
      'Priority support',
    ],
    limitations: [],
    cta: 'Start Monthly',
    ctaStyle: 'bg-blue-600 text-white hover:bg-blue-700',
    popular: false,
  },
  {
    id: 'lifetime',
    name: 'Lifetime Learner',
    price: '$100',
    period: 'one-time',
    description: 'Best value — pay once, learn forever',
    icon: StarIcon,
    badge: 'Limited Time',
    features: [
      'Everything in Monthly Pro, forever',
      'Unlimited AI-generated sets',
      'Unlimited versus mode challenges',
      'Advanced spaced repetition scheduling',
      'Generate from PDF, YouTube, audio & images',
      'All study modes (classic, multiple choice, typed)',
      'Full analytics, streaks & achievements',
      'Offline study support',
      'Priority support',
    ],
    limitations: [],
    cta: 'Get Lifetime Access',
    ctaStyle: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700',
    popular: true,
  },
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const currentTier = (session?.user as { subscriptionTier?: string })?.subscriptionTier || 'Free';
  const isAuthenticated = status === 'authenticated';

  const handleCheckout = async (plan: string) => {
    if (!isAuthenticated) {
      router.push('/auth/signup');
      return;
    }

    setLoadingPlan(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Something went wrong');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/portal');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Could not open billing portal');
      }
    } catch {
      alert('Failed to open billing portal');
    }
  };

  return (
    <div className="px-4 py-12 sm:py-20">
      {/* Success/Cancel Banners */}
      {success && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
          <p className="text-green-800 font-medium">
            Welcome to your new plan! Your subscription is now active.
          </p>
        </div>
      )}
      {canceled && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
          <p className="text-yellow-800 font-medium">
            Checkout was canceled. No charges were made.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10 sm:mb-16">
        <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <FireIcon className="h-4 w-4" />
          <span>Simple, Transparent Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Choose Your{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Learning Plan
          </span>
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
          Unlock your full learning potential. Cancel anytime on monthly plans.
        </p>
      </div>

      {/* Free Account Summary */}
      <div className="max-w-3xl mx-auto mb-12 p-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Free Account</h3>
        <p className="text-sm text-gray-600 mb-4">Get started with basic features — no credit card required</p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-700">
          <span>&#10003; 3 AI-generated sets/month</span>
          <span>&#10003; Classic study mode</span>
          <span>&#10003; Join versus challenges</span>
          <span>&#10003; Basic progress tracking</span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {tiers.map((tier) => {
          const isCurrentPlan =
            (tier.id === 'monthly' && currentTier === 'Monthly Pro') ||
            (tier.id === 'lifetime' && currentTier === 'Lifetime Learner');

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col bg-white rounded-2xl shadow-lg border-2 transition-all ${
                tier.popular
                  ? 'border-purple-500 shadow-purple-100 scale-[1.02] md:scale-105'
                  : 'border-gray-200'
              }`}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                    <StarIcon className="h-3.5 w-3.5" />
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="p-6 sm:p-8 flex-1 flex flex-col">
                {/* Icon + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`p-2 rounded-lg ${
                      tier.popular ? 'bg-purple-100' : 'bg-blue-100'
                    }`}
                  >
                    <tier.icon
                      className={`h-5 w-5 ${
                        tier.popular ? 'text-purple-600' : 'text-blue-600'
                      }`}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                </div>

                {/* Price */}
                <div className="mb-2">
                  <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                  <span className="text-sm text-gray-500 ml-1">
                    {tier.period === 'forever'
                      ? ''
                      : tier.period === 'one-time'
                        ? ' one-time'
                        : tier.period}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-6">{tier.description}</p>

                {/* CTA */}
                <div className="mb-6">
                  {isCurrentPlan ? (
                    <div className="w-full py-3 px-4 rounded-xl text-center font-medium bg-green-100 text-green-800 text-sm">
                      Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckout(tier.id)}
                      disabled={loadingPlan !== null}
                      className={`w-full py-3 px-4 rounded-xl font-medium transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed ${tier.ctaStyle}`}
                    >
                      {loadingPlan === tier.id ? 'Redirecting...' : tier.cta}
                    </button>
                  )}
                </div>

                {/* Features */}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    What&apos;s included
                  </p>
                  <ul className="space-y-2.5">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manage Subscription */}
      {isAuthenticated && currentTier !== 'Free' && (
        <div className="max-w-md mx-auto mt-10 text-center">
          <button
            onClick={handleManageSubscription}
            className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
          >
            Manage your subscription &amp; billing
          </button>
        </div>
      )}

      {/* FAQ / Trust */}
      <div className="max-w-3xl mx-auto mt-16 sm:mt-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {[
            {
              q: 'Can I cancel my monthly subscription?',
              a: 'Yes! You can cancel anytime from your billing portal. You\'ll keep access until the end of your billing period.',
            },
            {
              q: 'What does "Lifetime" mean?',
              a: 'Pay once and get access to all Pro features forever. No recurring charges.',
            },
            {
              q: 'Is the $100 lifetime price permanent?',
              a: 'This is a limited-time introductory price. We plan to increase it as we add more features.',
            },
            {
              q: 'Do I need an account to study?',
              a: 'You can study shared flashcard sets without an account. Sign up to create your own sets, track progress, and use AI generation.',
            },
          ].map((item) => (
            <details
              key={item.q}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer text-sm sm:text-base font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                {item.q}
                <span className="ml-4 text-gray-400 group-open:rotate-180 transition-transform">
                  &#9660;
                </span>
              </summary>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-gray-600">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Roadmap Link */}
      <div className="max-w-3xl mx-auto mt-12 text-center">
        <p className="text-gray-600 text-sm">
          Want to see what features are coming next?{' '}
          <Link href="/roadmap" className="text-blue-600 hover:text-blue-800 font-medium underline">
            View our product roadmap
          </Link>
        </p>
      </div>
    </div>
  );
}
