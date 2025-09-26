// app/pricing/page.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';

const plans = [
  {
    id: 'monthly',
    name: 'Monthly Pro',
    description: 'Perfect for trying out premium features',
    originalPrice: 999,
    price: 599,
    billing: 'month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE,
    popular: false,
    features: [
      'Unlimited AI flashcard generation',
      'Advanced spaced repetition',
      'Export to CSV/PDF',
      'Progress analytics',
      'Priority support',
    ],
  },
  {
    id: 'annual',
    name: 'Annual Pro',
    description: 'Best value for serious learners',
    originalPrice: 9900,
    price: 5900,
    billing: 'year',
    priceId: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE,
    popular: true,
    savings: 'Save $40',
    features: [
      'Everything in Monthly Pro',
      'Team collaboration (3 members)',
      'Advanced analytics',
      'Priority feature requests',
      'Monthly strategy calls',
    ],
  },
  {
    id: 'lifetime',
    name: 'Lifetime Access',
    description: 'One-time payment, lifetime access',
    originalPrice: 49900,
    price: 10000,
    billing: 'one-time',
    priceId: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE,
    popular: false,
    savings: 'Save $399',
    features: [
      'Everything in Annual Pro',
      'Lifetime updates',
      'Premium integrations',
      'White-label options',
      'Direct access to founders',
    ],
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const { trackEvent } = useAnalytics();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string, planId: string) => {
    if (!session) {
      window.location.href = '/auth/signin?callbackUrl=/pricing';
      return;
    }

    setLoading(planId);
    trackEvent('checkout_started', { plan: planId });

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const { sessionId } = await response.json();
      
      if (sessionId) {
        const stripe = await import('@stripe/stripe-js').then(s => 
          s.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        );
        await stripe?.redirectToCheckout({ sessionId });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      trackEvent('checkout_error', {
        plan: planId,
        error: errorMessage,
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Learning Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock the full power of AI-driven learning with advanced features and analytics
          </p>
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 inline-block">
            <p className="text-yellow-800 font-medium">
              🎉 Limited Time: Up to 80% off all plans!
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-lg border-2 ${
                plan.popular ? 'border-blue-500' : 'border-gray-200'
              } p-8`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${(plan.price / 100).toFixed(0)}
                  </span>
                  <span className="text-gray-600">
                    /{plan.billing === 'one-time' ? 'forever' : plan.billing}
                  </span>
                </div>
                
                {plan.originalPrice !== plan.price && (
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <span className="line-through text-gray-400">
                      ${(plan.originalPrice / 100).toFixed(0)}
                    </span>
                    {plan.savings && (
                      <span className="text-green-600 font-medium">
                        {plan.savings}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleSubscribe(plan.priceId!, plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50`}
              >
                {loading === plan.id ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  `Get ${plan.name}`
                )}
              </button>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade, downgrade, or cancel your subscription at any time through your account settings.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What happens to my data if I cancel?
              </h3>
              <p className="text-gray-600">
                Your flashcards and progress remain accessible. You&apos;ll keep all data and can reactivate anytime.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Is there a refund policy?
              </h3>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee for all plans. No questions asked.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}