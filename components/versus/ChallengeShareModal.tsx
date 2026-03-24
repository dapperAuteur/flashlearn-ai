'use client';

import { useState, useEffect } from 'react';
import {
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  XMarkIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { track } from '@vercel/analytics';
import { buildShareUrl, buildTwitterShareUrl } from '@/lib/share-urls';

interface ChallengeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeCode: string;
  challengeUrl: string;
  setName?: string;
}

export default function ChallengeShareModal({
  isOpen,
  onClose,
  challengeCode,
  challengeUrl,
  setName,
}: ChallengeShareModalProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCodeCopied(false);
      setUrlCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Use the public preview URL for all external shares
  const previewUrl = challengeUrl.replace('/versus/join/', '/versus/preview/');
  const shareUrlWithUtm = buildShareUrl(previewUrl, 'copy', 'versus');
  const shareText = setName
    ? `I challenged you to a flashcard battle on "${setName}"! Use code ${challengeCode} or join here:`
    : `I challenged you to a flashcard battle! Use code ${challengeCode} or join here:`;

  const twitterShareUrl = buildTwitterShareUrl(
    buildShareUrl(previewUrl, 'twitter', 'versus'),
    shareText,
    ['flashcards', 'studywithme', 'FlashLearnAI']
  );

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: 'FlashLearnAI.WitUS.Online Challenge',
        text: shareText,
        url: buildShareUrl(previewUrl, 'native', 'versus'),
      });
      track('share_generated', { type: 'versus', platform: 'native' });
    } catch {
      // User cancelled or API not available
    }
  };

  const copyToClipboard = async (text: string, type: 'code' | 'url') => {
    const valueToCopy = type === 'url' ? shareUrlWithUtm : text;
    try {
      await navigator.clipboard.writeText(valueToCopy);
      if (type === 'code') {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      }
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = valueToCopy;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        if (type === 'code') {
          setCodeCopied(true);
          setTimeout(() => setCodeCopied(false), 2000);
        } else {
          setUrlCopied(true);
          setTimeout(() => setUrlCopied(false), 2000);
        }
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
    if (type === 'url') {
      track('share_generated', { type: 'versus', platform: 'copy' });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md transform transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="share-modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-200">
            Share Challenge
          </h2>
          <button
            onClick={onClose}
            aria-label="Close share dialog"
            className="p-1 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Native share (mobile primary action) */}
        {canNativeShare && (
          <button
            onClick={handleNativeShare}
            className="w-full mb-4 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            <ShareIcon className="h-5 w-5" aria-hidden="true" />
            Share Challenge
          </button>
        )}

        {/* Twitter */}
        <a
          href={twitterShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full mb-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-black hover:bg-gray-900 transition-colors"
          onClick={() => track('share_generated', { type: 'versus', platform: 'twitter' })}
        >
          {/* X / Twitter icon */}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </a>

        {/* Challenge code display */}
        <div className="text-center mb-5">
          <p className="text-sm text-gray-600 mb-2">Challenge Code</p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <p className="text-3xl font-bold font-mono tracking-widest text-gray-900 dark:text-gray-100">
              {challengeCode}
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(challengeCode, 'code')}
            aria-label="Copy challenge code to clipboard"
            className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              codeCopied
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {codeCopied ? (
              <>
                <ClipboardDocumentCheckIcon className="h-4 w-4" aria-hidden="true" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
                Copy Code
              </>
            )}
          </button>
        </div>

        {/* Full URL */}
        <div className="mb-5">
          <p className="text-sm text-gray-600 mb-2">Or share this link</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={previewUrl}
              aria-label="Challenge share URL"
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-600 dark:text-gray-300 truncate"
            />
            <button
              onClick={() => copyToClipboard(previewUrl, 'url')}
              aria-label="Copy share URL to clipboard"
              className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                urlCopied
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {urlCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-bold py-2.5 px-4 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
