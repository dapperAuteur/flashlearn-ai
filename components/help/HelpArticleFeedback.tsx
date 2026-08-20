'use client';

import { useId, useRef, useState } from 'react';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';

/**
 * "Was this article helpful?" at the foot of a help article.
 *
 * These buttons existed for months with no handler behind them, so every
 * answer was discarded the moment it was clicked. The reader was thanked by
 * nothing and told nothing.
 *
 * A No opens an optional comment box, because the count says which article is
 * failing and only the comment says why. The count is recorded before the box
 * appears, so a reader who answers and walks away has still told us something.
 *
 * Works signed out on purpose. The in-app feedback widget renders only for
 * signed-in users, and the reader who most needs to report a bad article is
 * usually the one who has not signed up yet.
 */

interface Props {
  slug: string;
}

type Stage = 'asking' | 'commenting' | 'done';

const MAX_COMMENT = 2000;

export default function HelpArticleFeedback({ slug }: Props) {
  const [stage, setStage] = useState<Stage>('asking');
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const commentId = useId();
  const hintId = useId();

  const send = async (helpful: boolean, text?: string) => {
    setIsSending(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/help/${encodeURIComponent(slug)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful, ...(text ? { comment: text } : {}) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      return true;
    } catch {
      // Say so rather than showing a thank-you for something that did not
      // happen. Silently swallowing this is what the old buttons did.
      setFailed(true);
      setMessage('That did not send. Please try again in a moment.');
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleYes = async () => {
    if (await send(true)) {
      setMessage('Thanks. Glad it helped.');
      setStage('done');
    }
  };

  const handleNo = async () => {
    // Record the count first. A reader who clicks No and closes the tab has
    // still told us the article is failing, and that should not depend on
    // them writing a sentence.
    if (await send(false)) {
      setMessage('');
      setStage('commenting');
      // Focus moves to the box, so a keyboard or screen reader user is not
      // left behind on a button that has changed what it means.
      requestAnimationFrame(() => commentRef.current?.focus());
    }
  };

  const handleComment = async () => {
    const text = comment.trim();
    if (!text) {
      setMessage('Thanks. Your answer is recorded.');
      setStage('done');
      return;
    }
    if (await send(false, text)) {
      setMessage('Thanks. That went straight to the person who maintains these docs.');
      setStage('done');
    }
  };

  return (
    <div className="mt-10 p-6 bg-white rounded-xl border border-gray-200">
      {/* Mounted from the start and never conditionally inserted: a live region
          added at the same moment as its text is often not announced. */}
      <p
        role="status"
        aria-live="polite"
        className={
          message
            ? `mt-0 mb-3 text-sm text-center ${failed ? 'text-red-700' : 'text-green-800'}`
            : 'sr-only'
        }
      >
        {message}
      </p>

      {stage === 'asking' && (
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 mb-3">Was this article helpful?</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleYes}
              disabled={isSending}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-11 text-sm font-medium bg-green-50 text-green-800 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
            >
              <HandThumbUpIcon className="w-4 h-4" aria-hidden="true" />
              Yes
            </button>
            <button
              type="button"
              onClick={handleNo}
              disabled={isSending}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-11 text-sm font-medium bg-red-50 text-red-800 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              <HandThumbDownIcon className="w-4 h-4" aria-hidden="true" />
              No
            </button>
          </div>
        </div>
      )}

      {stage === 'commenting' && (
        <div>
          <label htmlFor={commentId} className="block text-sm font-medium text-gray-900">
            Thanks. What was missing?
          </label>
          <p id={hintId} className="mt-1 text-sm text-gray-700">
            Optional. Your answer is already recorded, so you can leave this blank.
            Anything you write here goes to the person who maintains these docs.
          </p>
          <textarea
            ref={commentRef}
            id={commentId}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={MAX_COMMENT}
            rows={4}
            aria-describedby={hintId}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-base text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            placeholder="What were you trying to do?"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleComment}
              disabled={isSending}
              className="min-h-11 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMessage('Thanks. Your answer is recorded.');
                setStage('done');
              }}
              className="min-h-11 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-900 rounded-lg hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              No thanks
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
