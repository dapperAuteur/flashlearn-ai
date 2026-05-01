'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SparklesIcon } from '@heroicons/react/24/outline';
import type { ActivePromotion } from '@/lib/promo/promotions';

function daysLeft(endsAt: Date, now: Date = new Date()): number {
  const ms = endsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

interface ActivePromoBannerProps {
  variant?: 'hero' | 'inline';
  className?: string;
}

// Client-side banner that consumes /api/promo/active. Renders nothing when
// there's no active promotion, so it's safe to drop into any page.
export default function ActivePromoBanner({ variant = 'inline', className = '' }: ActivePromoBannerProps) {
  const [promo, setPromo] = useState<ActivePromotion | null>(null);

  useEffect(() => {
    fetch('/api/promo/active')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setPromo(data.promotion ?? null))
      .catch(() => setPromo(null));
  }, []);

  if (!promo) return null;

  const days = daysLeft(new Date(promo.endsAt));
  const dayLabel = days === 0 ? 'Last day' : days === 1 ? '1 day left' : `${days} days left`;
  const message = promo.bannerMessage || `${promo.name}: every plan gets ${promo.flatLimit} AI sets per 30 days.`;
  const linkLabel = promo.bannerLinkLabel || 'See plans';
  const linkHref = promo.bannerLink || '/pricing';

  if (variant === 'hero') {
    return (
      <section
        role="region"
        aria-label={promo.name}
        className={`relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white ${className}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
          <span className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold">
            <SparklesIcon className="h-4 w-4" aria-hidden="true" />
            {message}
          </span>
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm">
            <span
              className="bg-white/20 rounded-full px-2 py-0.5 font-medium"
              aria-label={`${dayLabel} until the promo ends`}
            >
              {dayLabel}
            </span>
            <Link href={linkHref} className="underline underline-offset-2 hover:text-purple-100 font-medium">
              {linkLabel}
            </Link>
          </span>
        </div>
      </section>
    );
  }

  return (
    <div
      role="region"
      aria-label={promo.name}
      className={`bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-md p-4 sm:p-5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <SparklesIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm sm:text-base font-semibold">{message}</p>
            {promo.pricingCallout && (
              <p className="text-xs sm:text-sm text-purple-100 mt-0.5">{promo.pricingCallout}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="bg-white/20 rounded-full px-3 py-1 text-xs sm:text-sm font-medium"
            aria-label={`${dayLabel} until the promo ends`}
          >
            {dayLabel}
          </span>
          <Link
            href={linkHref}
            className="bg-white text-purple-700 hover:bg-purple-50 transition-colors rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold"
          >
            {linkLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
