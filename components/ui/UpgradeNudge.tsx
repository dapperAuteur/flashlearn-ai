'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';

interface UpgradeNudgeProps {
  feature: string;
  message?: string;
  variant?: 'banner' | 'modal';
  onClose?: () => void;
}

export default function UpgradeNudge({
  feature,
  message,
  variant = 'banner',
  onClose,
}: UpgradeNudgeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleClose = () => {
    setDismissed(true);
    onClose?.();
  };

  const defaultMessage = `Upgrade to Pro for a higher monthly cap on ${feature}.`;
  const displayMessage = message || defaultMessage;

  if (variant === 'modal') {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-nudge-title"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" aria-hidden="true" />
              </div>
              <h2 id="upgrade-nudge-title" className="text-lg font-bold text-gray-900">
                Upgrade to Pro
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              aria-label="Dismiss upgrade prompt"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-gray-600 text-sm mb-6">{displayMessage}</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/pricing"
              className="w-full text-center px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              View Plans
            </Link>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Banner variant
  return (
    <div
      className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
      role="status"
      aria-label="Upgrade prompt"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Sparkles className="h-4 w-4 text-purple-600 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm text-purple-800">{displayMessage}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/pricing"
          className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
        >
          Upgrade
        </Link>
        <button
          onClick={handleClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
