'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { X, ExternalLink } from 'lucide-react';

interface BannerData {
  active: boolean;
  bannerId: string;
  type: 'info' | 'warning' | 'promo' | 'ai';
  message: string;
  linkText?: string;
  linkUrl?: string;
  expiresAt?: string;
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync banner height into a CSS variable so sticky page headers can offset
  // their top: by exactly the banner's rendered height. Resets to 0px when the
  // banner is dismissed, hidden, or navigates to an admin route.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const visible = !!banner && !dismissed && !pathname?.startsWith('/admin');
    if (!visible) {
      document.documentElement.style.setProperty('--banner-h', '0px');
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty('--banner-h', `${el.offsetHeight}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty('--banner-h', '0px');
    };
  }, [banner, dismissed, pathname]);

  useEffect(() => {
    // Don't show on admin pages
    if (pathname?.startsWith('/admin')) return;

    fetch('/api/config/banner')
      .then((res) => res.json())
      .then((data: BannerData) => {
        if (!data.active || !data.message) return;

        // Defense in depth: server already suppresses expired banners, but a stale
        // edge cache could serve an active=true response past the cutoff.
        if (data.expiresAt) {
          const expiresAtMs = new Date(data.expiresAt).getTime();
          if (!Number.isNaN(expiresAtMs) && expiresAtMs <= Date.now()) return;
        }

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
      ref={containerRef}
      className={`sticky top-0 z-[60] ${typeStyles[banner.type] || typeStyles.info}`}
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
