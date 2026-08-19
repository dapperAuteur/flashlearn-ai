'use client';

import { useEffect, useState } from 'react';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { useStudySession } from '@/contexts/StudySessionContext';
import { useNetworkSync } from '@/hooks/useNetworkSync';
import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * Choose whether this session is your own study or a student's.
 *
 * Renders nothing at all when the signed-in user has nobody to record for,
 * which is the common case. `/api/study/proctorable-students` returns an empty
 * list rather than an error for those users, so an ordinary learner never sees
 * this and never has to wonder what it is.
 *
 * The default is always yourself. Recording onto somebody else's account is a
 * deliberate act, never something that happens because a previous choice stuck.
 */

interface ProctorableStudent {
  id: string;
  name: string;
  classrooms: string[];
  viaLink: boolean;
}

const SELF = 'self';

export default function ProctorStudentPicker() {
  const { proctorSubject, setProctorSubject } = useStudySession();
  const { isOnline } = useNetworkSync();
  const [students, setStudents] = useState<ProctorableStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/study/proctorable-students')
      .then((res) => (res.ok ? res.json() : { students: [] }))
      .then((data) => {
        if (!cancelled) setStudents(data.students ?? []);
      })
      .catch((error) => {
        // A picker that fails to load is not worth blocking study over. The
        // teacher falls back to studying as themselves.
        Logger.warning(LogContext.STUDY, 'Could not load proctorable students', { error });
        if (!cancelled) setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Offline study is keyed to whoever is signed in, so a proctored session
  // recorded offline would be written to the teacher's own profile. Rather than
  // silently mis-attribute it, drop any selection and say why.
  useEffect(() => {
    if (!isOnline && proctorSubject) setProctorSubject(null);
  }, [isOnline, proctorSubject, setProctorSubject]);

  if (isLoading || students.length === 0) return null;

  const selectedId = proctorSubject?.id ?? SELF;

  const handleChange = (value: string) => {
    if (value === SELF) {
      setProctorSubject(null);
      return;
    }
    const student = students.find((s) => s.id === value);
    if (student) {
      setProctorSubject({ id: student.id, name: student.name, mode: 'proctored' });
    }
  };

  const describe = (student: ProctorableStudent) => {
    if (student.classrooms.length > 0) return student.classrooms.join(', ');
    return student.viaLink ? 'Linked to you' : '';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-amber-100 p-2 rounded-lg">
            <AcademicCapIcon className="h-5 w-5 text-amber-700" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900" id="proctor-picker-label">
            Who is studying?
          </h2>
        </div>

        <label htmlFor="proctor-subject" className="block text-sm text-gray-600 mb-2">
          Pick a student to record their answers on their own account. Their spaced review
          schedule updates, not yours.
        </label>

        <select
          id="proctor-subject"
          value={selectedId}
          disabled={!isOnline}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-200 p-3 text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value={SELF}>Myself</option>
          {students.map((student) => {
            const detail = describe(student);
            return (
              <option key={student.id} value={student.id}>
                {detail ? `${student.name} (${detail})` : student.name}
              </option>
            );
          })}
        </select>

        {!isOnline && (
          <p role="status" className="mt-2 text-sm text-amber-800">
            You are offline. Studying for a student needs a connection, because offline results
            are saved against the signed-in account. Your own study still works.
          </p>
        )}

        {proctorSubject && isOnline && (
          <p role="status" className="mt-2 text-sm font-medium text-amber-900">
            This session will be saved to {proctorSubject.name}, not to you.
          </p>
        )}
      </div>
    </div>
  );
}
