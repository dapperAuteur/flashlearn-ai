'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Flashcard } from '@/types/flashcard';
import ConfidenceScale from './ConfidenceScale';
import {
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  LockClosedIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

interface TypeAnswerCardProps {
  flashcard: Flashcard;
  onResult: (isCorrect: boolean, timeSeconds: number) => void;
  onConfidenceSelect: (rating: number) => void;
  onEndSession: () => void;
  isConfidenceRequired: boolean;
  hasCompletedConfidence: boolean;
}

interface EvalResult {
  isCorrect: boolean;
  similarity: number;
  feedback: string;
}

export default function TypeAnswerCard({
  flashcard,
  onResult,
  onConfidenceSelect,
  onEndSession,
  isConfidenceRequired,
  hasCompletedConfidence,
}: TypeAnswerCardProps) {
  const [startTime] = useState(Date.now());
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<EvalResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardId = String(flashcard._id);

  useEffect(() => {
    setUserAnswer('');
    setEvaluation(null);
    setIsSubmitting(false);
    // Focus input when confidence is done
    if (hasCompletedConfidence) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [cardId, hasCompletedConfidence]);

  const handleSubmit = useCallback(async () => {
    if (!userAnswer.trim() || isSubmitting || evaluation) return;

    setIsSubmitting(true);

    const timeSeconds = Math.round((Date.now() - startTime) / 1000);

    try {
      const res = await fetch('/api/study/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswer: userAnswer.trim(),
          correctAnswer: flashcard.back,
          question: flashcard.front,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEvaluation(data);

        setTimeout(() => {
          onResult(data.isCorrect, timeSeconds);
        }, 2000);
      } else {
        // Fallback to simple comparison
        const isCorrect =
          userAnswer.trim().toLowerCase() === flashcard.back.trim().toLowerCase();
        setEvaluation({
          isCorrect,
          similarity: isCorrect ? 1 : 0,
          feedback: isCorrect ? 'Correct!' : 'Incorrect.',
        });

        setTimeout(() => {
          onResult(isCorrect, timeSeconds);
        }, 2000);
      }
    } catch {
      // Fallback to simple comparison
      const isCorrect =
        userAnswer.trim().toLowerCase() === flashcard.back.trim().toLowerCase();
      setEvaluation({
        isCorrect,
        similarity: isCorrect ? 1 : 0,
        feedback: isCorrect ? 'Correct!' : 'Incorrect.',
      });

      setTimeout(() => {
        onResult(isCorrect, timeSeconds);
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  }, [userAnswer, isSubmitting, evaluation, startTime, flashcard, onResult]);

  // Keyboard: Escape to end session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEndSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEndSession]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Instructions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-100 p-2 rounded-lg">
            {hasCompletedConfidence ? (
              <PencilSquareIcon className="h-5 w-5 text-orange-600" />
            ) : (
              <LockClosedIcon className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {!hasCompletedConfidence ? 'Rate your confidence first' : 'Type your answer'}
            </p>
            <p className="text-sm text-gray-600">
              {!hasCompletedConfidence
                ? 'How confident are you about this card?'
                : 'Type what you think the answer is, then submit'}
            </p>
          </div>
        </div>
      </div>

      {/* Confidence Rating */}
      {isConfidenceRequired && !evaluation && (
        <ConfidenceScale onRatingSelect={onConfidenceSelect} disabled={!isConfidenceRequired} />
      )}

      {/* Question Card */}
      <div className="bg-gradient-to-br from-white to-orange-50/50 rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8">
        <div className="text-center mb-2">
          <span className="inline-flex items-center bg-orange-100/50 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
            Type Answer
          </span>
        </div>
        <div
          className="text-center text-lg sm:text-xl prose prose-slate max-w-none leading-relaxed text-gray-800 mt-4"
          dangerouslySetInnerHTML={{ __html: flashcard.front }}
        />
      </div>

      {/* Answer Input */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={hasCompletedConfidence ? 'Type your answer...' : 'Rate confidence first'}
            disabled={!hasCompletedConfidence || !!evaluation}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:bg-gray-50"
          />
          <motion.button
            onClick={handleSubmit}
            disabled={!userAnswer.trim() || isSubmitting || !!evaluation || !hasCompletedConfidence}
            className="px-5 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            whileHover={!isSubmitting ? { scale: 1.02 } : {}}
            whileTap={!isSubmitting ? { scale: 0.98 } : {}}
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Evaluation Result */}
      {evaluation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border-2 p-6 ${
            evaluation.isCorrect
              ? 'border-green-500 bg-green-50'
              : 'border-red-500 bg-red-50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {evaluation.isCorrect ? (
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              ) : (
                <XCircleIcon className="h-8 w-8 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className={`font-semibold text-lg ${evaluation.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                {evaluation.isCorrect ? 'Correct!' : 'Incorrect'}
              </p>
              {evaluation.feedback && (
                <p className="text-sm text-gray-700 mt-1">{evaluation.feedback}</p>
              )}
              <div className="mt-3 space-y-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Your answer:</span> {userAnswer}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Correct answer:</span> {flashcard.back}
                </p>
                {evaluation.similarity > 0 && evaluation.similarity < 1 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Match:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            evaluation.similarity >= 0.7 ? 'bg-green-500' : evaluation.similarity >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${evaluation.similarity * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{Math.round(evaluation.similarity * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
