'use client';

import { useState, useEffect } from 'react';
import {
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ChallengeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeCode: string;
  challengeUrl: string;
}

export default function ChallengeShareModal({
  isOpen,
  onClose,
  challengeCode,
  challengeUrl,
}: ChallengeShareModalProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCodeCopied(false);
      setUrlCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, type: 'code' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      const textArea = document.createElement('textarea');
      textArea.value = text;
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
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md transform transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            Share Challenge
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Challenge code display */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-2">Challenge Code</p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <p className="text-3xl font-bold font-mono tracking-widest text-gray-900 dark:text-gray-100">
              {challengeCode}
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(challengeCode, 'code')}
            className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              codeCopied
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {codeCopied ? (
              <>
                <ClipboardDocumentCheckIcon className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="h-4 w-4" />
                Copy Code
              </>
            )}
          </button>
        </div>

        {/* Full URL */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">Or share this link</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={challengeUrl}
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-600 dark:text-gray-300 truncate"
            />
            <button
              onClick={() => copyToClipboard(challengeUrl, 'url')}
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
