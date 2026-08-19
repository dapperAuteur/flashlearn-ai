'use client';

import { UserCircleIcon } from '@heroicons/react/24/solid';
import type { ProctorSubject } from '@/contexts/StudySessionContext';

/**
 * Says whose record a study session is being written to, for the whole session.
 *
 * This is the safety-critical part of proctored study. A teacher who loses
 * track of which student is selected writes results onto the wrong person, and
 * because those results drive SM-2 scheduling the damage compounds over weeks
 * of reviews before anyone notices. So the name is always on screen, it is
 * never abbreviated, and it does not scroll away.
 *
 * The state is carried by the text, not the colour, so it reads the same to
 * someone who cannot distinguish the amber.
 */
export default function ProctorBanner({ subject }: { subject: ProctorSubject }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 sm:px-5"
    >
      <UserCircleIcon aria-hidden="true" className="h-6 w-6 shrink-0" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">
          Recording for {subject.name}
        </p>
        <p className="mt-0.5 text-amber-800 dark:text-amber-200">
          {subject.mode === 'handoff'
            ? 'These answers are saved to their account, not yours.'
            : 'Their answers, saved to their account. Not yours.'}
        </p>
      </div>
    </div>
  );
}
