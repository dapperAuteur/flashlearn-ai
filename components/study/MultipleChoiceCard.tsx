'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flashcard } from '@/types/flashcard';
import ConfidenceScale from './ConfidenceScale';
import {
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  LockClosedIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';

interface MultipleChoiceCardProps {
  flashcard: Flashcard;
  distractors: string[];
  onResult: (isCorrect: boolean, timeSeconds: number) => void;
  onConfidenceSelect: (rating: number) => void;
  onEndSession: () => void;
  isConfidenceRequired: boolean;
  hasCompletedConfidence: boolean;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function shuffleChoices(correct: string, distractors: string[]): string[] {
  // Strip HTML from all choices and filter out blanks/duplicates
  const cleanCorrect = stripHtml(correct);
  const cleanDistractors = distractors
    .map(d => stripHtml(d))
    .filter(d => d && d !== cleanCorrect);

  const all = [cleanCorrect, ...cleanDistractors.slice(0, 3)];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

export default function MultipleChoiceCard({
  flashcard,
  distractors,
  onResult,
  onConfidenceSelect,
  onEndSession,
  isConfidenceRequired,
  hasCompletedConfidence,
}: MultipleChoiceCardProps) {
  const [startTime] = useState(Date.now());
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [eliminatedChoices, setEliminatedChoices] = useState<Set<string>>(new Set());
  const [choices, setChoices] = useState<string[]>([]);

  const correctAnswer = stripHtml(flashcard.back);
  const cardId = String(flashcard._id);

  useEffect(() => {
    setChoices(shuffleChoices(correctAnswer, distractors));
    setSelectedAnswer(null);
    setIsAnswered(false);
    setHintUsed(false);
    setEliminatedChoices(new Set());
  }, [cardId, correctAnswer, distractors]);

  const handleSelect = useCallback(
    (answer: string) => {
      if (isAnswered || !hasCompletedConfidence) return;

      setSelectedAnswer(answer);
      setIsAnswered(true);

      const timeSeconds = Math.round((Date.now() - startTime) / 1000);
      const isCorrect = answer === correctAnswer;

      // Small delay before recording result to show feedback
      setTimeout(() => {
        onResult(isCorrect, timeSeconds);
      }, 1200);
    },
    [isAnswered, hasCompletedConfidence, startTime, correctAnswer, onResult],
  );

  const handleHint = useCallback(() => {
    if (hintUsed || isAnswered) return;
    setHintUsed(true);

    // Eliminate 2 wrong answers
    const wrongChoices = choices.filter((c) => c !== correctAnswer);
    const toEliminate = new Set<string>();
    const shuffled = [...wrongChoices].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(2, shuffled.length); i++) {
      toEliminate.add(shuffled[i]);
    }
    setEliminatedChoices(toEliminate);
  }, [hintUsed, isAnswered, choices, correctAnswer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (isAnswered) return;

      if (e.key === 'h' && !hintUsed) {
        e.preventDefault();
        handleHint();
        return;
      }
      if (e.key === 'Escape') {
        onEndSession();
        return;
      }

      if (!hasCompletedConfidence) return;

      const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 };
      const idx = keyMap[e.key.toLowerCase()];
      if (idx !== undefined && idx < choices.length && !eliminatedChoices.has(choices[idx])) {
        handleSelect(choices[idx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, hintUsed, hasCompletedConfidence, choices, eliminatedChoices, handleHint, handleSelect, onEndSession]);

  const labels = ['A', 'B', 'C', 'D'];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Instructions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              {hasCompletedConfidence ? (
                <CursorArrowRaysIcon className="h-5 w-5 text-purple-600" />
              ) : (
                <LockClosedIcon className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {!hasCompletedConfidence ? 'Rate your confidence first' : 'Select the correct answer'}
              </p>
              <p className="text-sm text-gray-600">
                {!hasCompletedConfidence
                  ? 'How confident are you about this card?'
                  : 'Choose from the options below'}
              </p>
            </div>
          </div>
          {!isAnswered && hasCompletedConfidence && !hintUsed && (
            <button
              onClick={handleHint}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
            >
              <LightBulbIcon className="h-4 w-4 mr-1.5" />
              Hint
            </button>
          )}
        </div>
      </div>

      {/* Confidence Rating */}
      {isConfidenceRequired && !isAnswered && (
        <ConfidenceScale onRatingSelect={onConfidenceSelect} disabled={!isConfidenceRequired} />
      )}

      {/* Question Card */}
      <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8">
        <div className="text-center mb-2">
          <span className="inline-flex items-center bg-purple-100/50 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
            Multiple Choice
          </span>
        </div>
        <div
          className="text-center text-lg sm:text-xl prose prose-slate max-w-none leading-relaxed text-gray-800 mt-4"
          dangerouslySetInnerHTML={{ __html: flashcard.front }}
        />
      </div>

      {/* Answer Choices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {choices.map((choice, idx) => {
          const isEliminated = eliminatedChoices.has(choice);
          const isSelected = selectedAnswer === choice;
          const isCorrectChoice = choice === correctAnswer;
          const showCorrect = isAnswered && isCorrectChoice;
          const showWrong = isAnswered && isSelected && !isCorrectChoice;

          return (
            <motion.button
              key={`${cardId}-${idx}`}
              onClick={() => !isEliminated && handleSelect(choice)}
              disabled={isAnswered || !hasCompletedConfidence || isEliminated}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                isEliminated
                  ? 'border-gray-200 bg-gray-100 opacity-40 cursor-not-allowed'
                  : showCorrect
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : showWrong
                      ? 'border-red-500 bg-red-50 shadow-md'
                      : isSelected
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : hasCompletedConfidence
                          ? 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm cursor-pointer'
                          : 'border-gray-200 bg-white opacity-60 cursor-not-allowed'
              }`}
              whileHover={!isAnswered && hasCompletedConfidence && !isEliminated ? { scale: 1.02 } : {}}
              whileTap={!isAnswered && hasCompletedConfidence && !isEliminated ? { scale: 0.98 } : {}}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    showCorrect
                      ? 'bg-green-500 text-white'
                      : showWrong
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {showCorrect ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : showWrong ? (
                    <XCircleIcon className="h-5 w-5" />
                  ) : (
                    labels[idx]
                  )}
                </span>
                <span className="text-sm sm:text-base text-gray-800 pt-1">{choice}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Keyboard shortcuts */}
      <div className="hidden sm:block text-center">
        <p className="text-xs text-gray-400">
          Keys: <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">1-4</kbd> Select &middot;{' '}
          <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">H</kbd> Hint &middot;{' '}
          <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Esc</kbd> End
        </p>
      </div>
    </div>
  );
}
