'use client';

import { useEffect, useRef, useState } from 'react';
import { KeyIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

/**
 * Shows a claim code once, because once is all the server will ever give.
 *
 * The code is stored hashed, so a teacher who loses it cannot look it up and
 * has to mint a new one. That is why this is a modal with a single deliberate
 * way out instead of a toast: a code that scrolls away is a code the student
 * never gets.
 *
 * Escape and backdrop clicks do NOT close it, on purpose. Both are reflexes,
 * and a reflex that destroys a credential is the wrong default here. The
 * confirm button is always reachable by keyboard and is the first thing
 * focused.
 */

interface ClaimCodeDialogProps {
  studentName: string;
  claimCode: string;
  expiresAt: string | null;
  onDismiss: () => void;
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ClaimCodeDialog({
  studentName,
  claimCode,
  expiresAt,
  onDismiss,
}: ClaimCodeDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  // Keep Tab inside the dialog. There are only three controls, so a hand-rolled
  // cycle is smaller than pulling in a focus-trap library for one screen.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(claimCode);
      setCopyState('copied');
    } catch {
      // Clipboard access is refused in some mobile browsers and in any
      // non-secure context. The code is on screen either way, so say so
      // rather than failing silently.
      setCopyState('failed');
    }
  };

  const expiry = formatExpiry(expiresAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-code-title"
        aria-describedby="claim-code-warning"
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-2 p-5 border-b border-gray-200">
          <KeyIcon className="h-5 w-5 text-amber-600" aria-hidden="true" />
          <h2 id="claim-code-title" className="text-lg font-semibold text-gray-900">
            Claim code for {studentName}
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <p
            id="claim-code-warning"
            className="text-sm font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3"
          >
            Write this down now. It is shown once and cannot be looked up again. If it is
            lost you can create a new code, which stops this one working.
          </p>

          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <p
              className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-white break-all"
              data-testid="claim-code-value"
            >
              {claimCode}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
            Copy code
          </button>

          <p role="status" aria-live="polite" className="text-sm text-gray-700 min-h-5">
            {copyState === 'copied' && 'Claim code copied to the clipboard.'}
            {copyState === 'failed' &&
              'This browser would not let the page copy. Type the code from the screen.'}
          </p>

          <div className="text-sm text-gray-700 space-y-2">
            <p>
              Give the code to {studentName}. At{' '}
              <span className="font-medium text-gray-900">flashlearnai.witus.online/claim</span>{' '}
              they add their own email address and password, and the account becomes theirs
              with every session and every card result they have already done.
            </p>
            {expiry && <p>The code stops working on {expiry}.</p>}
            <p className="text-gray-600">
              Until they claim it, this student cannot sign in, study at home, or see their own
              progress. You can still run sessions for them from the roster.
            </p>
          </div>
        </div>

        <div className="p-5 border-t border-gray-200">
          <button
            ref={confirmRef}
            type="button"
            onClick={onDismiss}
            className="w-full min-h-12 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            I have written the code down
          </button>
        </div>
      </div>
    </div>
  );
}
