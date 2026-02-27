'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, ExternalLink } from 'lucide-react';

interface BannerData {
  active: boolean;
  bannerId: string;
  type: 'info' | 'warning' | 'promo' | 'ai';
  message: string;
  linkText?: string;
  linkUrl?: string;
}

const typeStyles: Record<string, string> = {
  info: 'bg-blue-600 text-white',
  warning: 'bg-yellow-500 text-gray-900',
  promo: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white',
  ai: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
};

export default function AnnouncementBanner() {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Don't show on admin pages
    if (pathname?.startsWith('/admin')) return;

    fetch('/api/config/banner')
      .then((res) => res.json())
      .then((data: BannerData) => {
        if (!data.active || !data.message) return;

        const dismissKey = `banner_dismissed_${data.bannerId}`;
        if (localStorage.getItem(dismissKey) === 'true') {
          setDismissed(true);
          return;
        }

        setBanner(data);
      })
      .catch(() => {});
  }, [pathname]);

  if (!banner || dismissed || pathname?.startsWith('/admin')) return null;

  const handleDismiss = () => {
    localStorage.setItem(`banner_dismissed_${banner.bannerId}`, 'true');
    setDismissed(true);
  };

  return (
    <div
      className={`relative ${typeStyles[banner.type] || typeStyles.info}`}
      role="alert"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <span className="text-center">{banner.message}</span>
        {banner.linkText && banner.linkUrl && (
          <a
            href={banner.linkUrl}
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:opacity-80 flex-shrink-0"
          >
            {banner.linkText}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
