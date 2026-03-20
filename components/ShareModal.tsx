'use client';

import { useState, useEffect } from 'react';
import { track } from '@vercel/analytics';
import { buildShareUrl, buildTwitterShareUrl, buildFacebookShareUrl, buildEmailShareUrl } from '@/lib/share-urls';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
  heading?: string;
  shareText?: string;
  campaign?: 'versus' | 'results' | 'set';
}

export default function ShareModal({ isOpen, onClose, shareUrl, title, heading, shareText, campaign = 'set' }: ShareModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleCopy = async () => {
    const urlWithUtm = buildShareUrl(shareUrl, 'copy', campaign);
    try {
      await navigator.clipboard.writeText(urlWithUtm);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = urlWithUtm;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed: ', err);
      }
      document.body.removeChild(textArea);
    }
    track('share_generated', { type: campaign, platform: 'copy' });
  };

  const resolvedShareText = shareText ?? 'Check out this flashcard set';

  const twitterUrl = buildTwitterShareUrl(
    buildShareUrl(shareUrl, 'twitter', campaign),
    resolvedShareText
  );
  const facebookUrl = buildFacebookShareUrl(buildShareUrl(shareUrl, 'facebook', campaign));
  const emailUrl = buildEmailShareUrl(
    `${resolvedShareText}: ${title}`,
    `${resolvedShareText}\n\nStudy this set free on FlashLearnAI.WitUS.Online:\n${buildShareUrl(shareUrl, 'email', campaign)}\n\nCreate your own AI flashcards at https://flashlearnai.witus.online`
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md transform transition-transform duration-300 scale-95"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">{heading ?? 'Share This Set'}</h2>

        <div className="flex items-center space-x-2 mb-4">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300"
          />
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-md text-white font-semibold ${isCopied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex justify-center space-x-4">
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-blue-500"
            onClick={() => track('share_generated', { type: campaign, platform: 'twitter' })}
          >
            {/* SVG for Twitter */}
          </a>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-blue-800"
            onClick={() => track('share_generated', { type: campaign, platform: 'facebook' })}
          >
            {/* SVG for Facebook */}
          </a>
          <a
            href={emailUrl}
            className="text-gray-500 hover:text-red-500"
            onClick={() => track('share_generated', { type: campaign, platform: 'email' })}
          >
            {/* SVG for Email */}
          </a>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
