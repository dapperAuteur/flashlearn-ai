'use client';

import { Archive } from 'lucide-react';
import type { ContainerKind } from '@/lib/api/assertNotArchived';

interface ArchivedBannerProps {
  kind: ContainerKind;
  /** Extra classes for page-specific spacing. */
  className?: string;
}

const COPY: Record<ContainerKind, { heading: string; body: string }> = {
  classroom: {
    heading: 'This classroom is archived',
    body: 'The teacher who owned it deleted their FlashLearnAI account. You can still open it and study the sets that are already here. Nobody can join it, and no new assignments or sets can be added, until an admin assigns a new teacher.',
  },
  team: {
    heading: 'This study group is archived',
    body: 'The member who created it deleted their FlashLearnAI account. You can still open it, read past messages, and study the sets that are already here. Nobody can join it, and no new messages or sets can be added, until an admin assigns a new owner. You can leave the group at any time.',
  },
  school: {
    heading: 'This school is archived',
    body: 'The administrator who owned it deleted their FlashLearnAI account. Its classrooms stay readable. No new classrooms, teachers, or students can be added until an admin assigns a new administrator.',
  },
};

/**
 * Shown at the top of any archived classroom, study group, or school view.
 * The state is carried by the heading text, not by the amber styling, so it
 * survives a screen reader, a high-contrast mode, and a colour-blind reader.
 */
export default function ArchivedBanner({ kind, className = '' }: ArchivedBannerProps) {
  const { heading, body } = COPY[kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5 dark:border-amber-700 dark:bg-amber-950 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <Archive
          className="h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-300"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{heading}</p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{body}</p>
        </div>
      </div>
    </div>
  );
}
