'use client';

import { useState, useEffect } from 'react';
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
    price: '$10.60',
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
    price: '$103.29',
    period: 'one-time',
    description: 'First 100 users — pay once, learn forever. Processing fees included.',
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
  {
    id: 'annual',
    name: 'Annual Pro',
    price: '$103.29',
    period: '/year',
    description: 'Best value — save vs monthly. All Pro features.',
    icon: StarIcon,
    badge: 'Save 19%',
    features: [
      'Everything in Monthly Pro',
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
    cta: 'Start Annual',
    ctaStyle: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700',
    popular: true,
  },
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [founders, setFounders] = useState<{ limit: number; count: number; remaining: number; active: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/pricing/founders')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setFounders(d); })
      .catch(() => {});
  }, []);

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
        {tiers
          .filter((tier) => {
            // When founders spots are gone, hide lifetime and show annual
            if (founders && !founders.active) {
              return tier.id !== 'lifetime';
            }
            // When founders spots remain, hide annual and show lifetime
            return tier.id !== 'annual';
          })
          .map((tier) => {
          const isCurrentPlan =
            (tier.id === 'monthly' && currentTier === 'Monthly Pro') ||
            (tier.id === 'lifetime' && currentTier === 'Lifetime Learner') ||
            (tier.id === 'annual' && currentTier === 'Annual Pro');

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
                <p className="text-sm text-gray-600 mb-3">{tier.description}</p>

                {/* Founders counter on lifetime card */}
                {tier.id === 'lifetime' && founders && founders.active && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Founder&apos;s Price</span>
                      <span>{founders.remaining} of {founders.limit} remaining</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${founders.remaining <= 10 ? 'bg-red-500' : founders.remaining <= 30 ? 'bg-amber-500' : 'bg-purple-500'}`}
                        style={{ width: `${Math.min(100, (founders.count / founders.limit) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

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

      {/* CashApp Lifetime Payment — hidden when founder spots are gone */}
      {(!founders || founders.active) && (
        <CashAppSection isAuthenticated={isAuthenticated} />
      )}

      {/* API Pricing Section */}
      <section className="max-w-3xl mx-auto mt-16 sm:mt-20" aria-labelledby="api-pricing-heading">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gray-900 text-gray-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <span>Developer API</span>
          </div>
          <h2 id="api-pricing-heading" className="text-2xl font-bold text-gray-900 mb-2">
            Build with the FlashLearnAI.WitUS.Online API
          </h2>
          <p className="text-gray-600 text-sm">
            23 REST endpoints. Generate flashcards, run spaced repetition, and create quiz challenges from your own app.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { name: 'Free', price: '$0', gens: '100', calls: '1,000' },
            { name: 'Developer', price: '$19/mo', gens: '5,000', calls: '50,000' },
            { name: 'Pro', price: '$49/mo', gens: '25,000', calls: '250,000' },
            { name: 'Enterprise', price: 'Custom', gens: 'Unlimited', calls: 'Unlimited' },
          ].map((tier) => (
            <div key={tier.name} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-sm font-semibold text-gray-900">{tier.name}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{tier.price}</p>
              <p className="text-xs text-gray-500 mt-2">{tier.gens} generations/mo</p>
              <p className="text-xs text-gray-500">{tier.calls} API calls/mo</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/docs/api/getting-started" className="text-sm text-blue-600 hover:text-blue-800 font-medium underline">
            Read the API docs
          </Link>
          <span className="mx-2 text-gray-500">|</span>
          <Link href="/developer" className="text-sm text-blue-600 hover:text-blue-800 font-medium underline">
            Get your free API key
          </Link>
        </div>

        {/* White-Label Pricing */}
        <div className="mt-8 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 text-center mb-2">White-Label Study App</h3>
          <p className="text-sm text-gray-600 text-center mb-6 max-w-lg mx-auto">
            Deploy your own branded flashcard platform. AI generation, spaced repetition, versus mode &mdash; your name, your colors, your domain.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              <p className="text-sm font-semibold text-gray-900">Standard License</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">$499</p>
              <p className="text-xs text-gray-500">one-time</p>
              <ul className="text-xs text-gray-600 mt-3 space-y-1.5 text-left">
                <li className="flex items-start gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />1 domain deployment</li>
                <li className="flex items-start gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />Full branding &amp; SEO editors</li>
                <li className="flex items-start gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />One-click Vercel deploy</li>
                <li className="flex items-start gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />Private GitHub repo access</li>
                <li className="flex items-start gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />Community support</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border-2 border-purple-300 p-5 text-center relative">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">Best Value</span>
              <p className="text-sm font-semibold text-gray-900">School &amp; Enterprise</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">$999</p>
              <p className="text-xs text-gray-500">/year</p>
              <ul className="text-xs text-gray-600 mt-3 space-y-1.5 text-left">
                <li className="flex items-start gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />Unlimited domains</li>
                <li className="flex items-start gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />Priority support</li>
                <li className="flex items-start gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />Continuous updates</li>
                <li className="flex items-start gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />Pro API tier included</li>
                <li className="flex items-start gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />Private GitHub repo access</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">
            API usage billed separately.{' '}
            <a href="mailto:admin.flashlearnai@awews.com" className="text-purple-600 hover:underline font-medium">Contact us to purchase &rarr;</a>
          </p>
        </div>
      </section>

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
              q: 'Is the $103.29 lifetime price permanent?',
              a: 'This introductory price is available to the first 100 users. After that, we\'ll offer an annual plan at a similar price point. Want to pay exactly $100? Use Cash App (no processing fees).',
            },
            {
              q: 'Do I need an account to study?',
              a: 'You can study shared flashcard sets without an account. Sign up to create your own sets, track progress, and use AI generation.',
            },
            {
              q: 'Is the API really free?',
              a: 'Yes! The Free tier gives you 100 AI generations and 1,000 API calls per month. No credit card required. Upgrade anytime if you need more.',
            },
            {
              q: 'What is the white-label app?',
              a: 'It\'s a ready-to-deploy study app powered by the FlashLearnAI API. Schools and companies customize the branding (name, colors, logo) and deploy as their own. Standard license is $499 (1 domain), School & Enterprise is $999/year (unlimited domains, priority support, updates).',
            },
          ].map((item) => (
            <details
              key={item.q}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer text-sm sm:text-base font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                {item.q}
                <span className="ml-4 text-gray-600 group-open:rotate-180 transition-transform">
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

function CashAppSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [cashAppName, setCashAppName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/cashapp')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.payment?.status) setExistingStatus(d.payment.status);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const handleSubmit = async () => {
    if (!cashAppName.trim()) {
      setError('Please enter your Cash App name');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/cashapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cashAppName: cashAppName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit payment');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-lg mx-auto mt-12" aria-labelledby="cashapp-heading">
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 sm:p-6 text-center">
        <h2 id="cashapp-heading" className="text-lg font-bold text-gray-900 mb-1">
          Lifetime via Cash App
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Pay exactly <strong>$100</strong> for Lifetime &mdash; no processing fees.
        </p>

        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/cashapp-qr.jpg"
            alt="Scan to pay $centenarian on Cash App"
            className="w-36 h-36 sm:w-44 sm:h-44 rounded-lg shadow-sm"
            width={176}
            height={176}
          />
        </div>
        <p className="text-base font-semibold text-green-800 mb-4">$centenarian</p>

        {submitted || existingStatus === 'pending' ? (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3" role="status">
            <p className="text-sm font-medium text-green-800">Payment submitted!</p>
            <p className="text-xs text-green-700 mt-1">We&apos;ll verify and activate your Lifetime membership within 24 hours.</p>
          </div>
        ) : existingStatus === 'verified' ? (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3" role="status">
            <p className="text-sm font-medium text-green-800">You&apos;re a Lifetime member!</p>
          </div>
        ) : isAuthenticated ? (
          <div className="max-w-xs mx-auto space-y-3">
            <p className="text-xs text-gray-500">1. Send $100 to <strong>$centenarian</strong> on Cash App</p>
            <p className="text-xs text-gray-500">2. Enter your Cash App name below</p>
            <div>
              <label htmlFor="cashapp-name" className="sr-only">Your Cash App name</label>
              <input
                id="cashapp-name"
                type="text"
                value={cashAppName}
                onChange={(e) => setCashAppName(e.target.value)}
                placeholder="Your Cash App name (e.g. $john)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 text-center focus:ring-green-500 focus:border-green-500"
              />
            </div>
            {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : "I've Sent $100"}
            </button>
            <p className="text-[10px] text-gray-400">Cash App charges a 2.75% fee on their end.</p>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            <Link href="/auth/signup" className="text-green-700 underline font-medium">Sign up</Link> first, then come back to pay via Cash App.
          </p>
        )}
      </div>
    </section>
  );
}
