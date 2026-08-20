'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { useStudySession } from '@/contexts/StudySessionContext';
import { useNetworkSync } from '@/hooks/useNetworkSync';
import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * Picks up a `studentId` handed over by a classroom roster link and makes that
 * student the subject of this session before the teacher chooses a set.
 *
 * The id is only a hint. It is resolved against
 * /api/study/proctorable-students, the same list the picker uses and the same
 * set of people the write path will accept, so a link to somebody a teacher may
 * not record for resolves to nothing instead of failing later at save time.
 *
 * Nothing here changes the default. With no `studentId` in the URL the
 * component renders null and the session stays self-study, which is what
 * recording onto another person's account being deliberate means in practice.
 */

interface ProctorableStudent {
  id: string;
  name: string;
}

type Resolution = 'idle' | 'loading' | 'matched' | 'unknown' | 'failed';

export default function ProctorSubjectFromLink() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId');
  const { proctorSubject, setProctorSubject } = useStudySession();
  const { isOnline } = useNetworkSync();
  const [resolution, setResolution] = useState<Resolution>('idle');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  // The link is honored once. After that the picker on the last step, and the
  // opt-out button below, own the choice, and re-applying would undo them.
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!studentId || appliedRef.current || !isOnline) return;
    appliedRef.current = true;
    setResolution('loading');
    let cancelled = false;

    fetch('/api/study/proctorable-students')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('request failed'))))
      .then((data) => {
        if (cancelled) return;
        const students: ProctorableStudent[] = data.students ?? [];
        const match = students.find((student) => student.id === studentId);
        if (!match) {
          setResolution('unknown');
          return;
        }
        setResolvedName(match.name);
        setProctorSubject({ id: match.id, name: match.name, mode: 'proctored' });
        setResolution('matched');
      })
      .catch((error) => {
        if (cancelled) return;
        Logger.warning(LogContext.STUDY, 'Could not resolve a proctor subject from a link', {
          error,
        });
        setResolution('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, isOnline, setProctorSubject]);

  if (!studentId) return null;

  if (!isOnline) {
    return (
      <div
        role="status"
        className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-900"
      >
        You are offline. Studying for a student needs a connection, because offline results are
        saved against the account that is signed in. Your own study still works.
      </div>
    );
  }

  if (resolution === 'loading' || resolution === 'idle') {
    return (
      <div role="status" className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 text-sm text-gray-700">
        Checking who this session is for...
      </div>
    );
  }

  if (resolution === 'unknown' || resolution === 'failed') {
    return (
      <div
        role="alert"
        className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-800"
      >
        {resolution === 'unknown'
          ? 'That student is not one you can study for. They may have been removed from your class. This session will be saved to you.'
          : 'We could not check who this session is for, so it will be saved to you.'}
      </div>
    );
  }

  if (!proctorSubject) {
    // The teacher opted out after the link resolved, so the session is theirs
    // again and there is nothing left to warn about.
    return null;
  }

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <AcademicCapIcon className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p role="status" className="text-sm font-semibold text-amber-900">
              This session will be saved to {resolvedName ?? proctorSubject.name}, not to you.
            </p>
            <p className="text-sm text-amber-900 mt-1">
              Pick a set below. Their answers update their review schedule.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setProctorSubject(null)}
          className="min-h-11 shrink-0 px-4 py-2 bg-white border border-amber-400 text-sm font-medium text-amber-900 rounded-lg hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        >
          Study as myself instead
        </button>
      </div>
    </div>
  );
}
