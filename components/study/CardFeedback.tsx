'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStudySession } from '@/contexts/StudySessionContext';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const feedbackVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function CardFeedback() {
  const { lastCardResult, showNextCard } = useStudySession();

  // Add keyboard shortcut for "Enter" to go to the next card
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        showNextCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNextCard]);

  if (!lastCardResult) return null;

  const isCorrect = lastCardResult === 'correct';
  const messages = { // Issue https://github.com/dapperAuteur/flashlearn-ai/issues/6
    correct: ["Awesome!", "You got it!", "Great job!", "Keep it up!"],
    incorrect: ["Keep trying!", "Almost there.", "You'll get it next time.", "Don't give up!"]
  };
  // Select a random message
  const message = messages[lastCardResult][Math.floor(Math.random() * messages[lastCardResult].length)];

  return (
    <motion.div
      variants={feedbackVariants}
      initial="hidden"
      animate="visible"
      className={`w-full h-80 rounded-lg flex flex-col items-center justify-center text-white p-6 shadow-lg ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
    >
      {isCorrect ? (
        <CheckCircleIcon className="h-16 w-16 mb-4" />
      ) : (
        <XCircleIcon className="h-16 w-16 mb-4" />
      )}
      <p className="text-3xl font-bold mb-6">{message}</p>
      <button
        onClick={showNextCard}
        className="px-8 py-3 bg-white text-lg font-semibold rounded-md shadow-md text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        Next Card
      </button>
    </motion.div>
  );
}