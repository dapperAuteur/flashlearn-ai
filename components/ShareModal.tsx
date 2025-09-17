'use client';

import { useState, useEffect } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
}

export default function ShareModal({ isOpen, onClose, shareUrl, title }: ShareModalProps) {
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
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
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
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(`Check out this flashcard set: ${title}`);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md transform transition-transform duration-300 scale-95"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Share This Set</h2>
        
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
            <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500">
                {/* SVG for Twitter */}
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-800">
                {/* SVG for Facebook */}
            </a>
            <a href={`mailto:?subject=${encodedTitle}&body=Check out this flashcard set I made on Flashlearn AI: ${encodedUrl}`} className="text-gray-500 hover:text-red-500">
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
