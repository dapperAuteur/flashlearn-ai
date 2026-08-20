'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  UserGroupIcon,
  UserPlusIcon,
  PlayIcon,
  KeyIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import ClaimCodeDialog from './ClaimCodeDialog';
import { Logger, LogContext } from '@/lib/logging/client-logger';

/**
 * The roster for one classroom, and the only place a teacher creates a student
 * account.
 *
 * It reads /api/teacher/classrooms/:id/students rather than the roster on
 * /api/classrooms/:id, because only the teacher view can tell a managed account
 * apart from a student who signed themselves up. The managed account's address
 * is synthetic and never leaves the server, so a managed row shows no email at
 * all instead of showing one nobody can write to.
 */

interface RosterStudent {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  isManaged: boolean;
  managedByYou: boolean;
  hasClaimCode: boolean;
  claimCodeExpiresAt: string | null;
  claimCodeExpired: boolean;
  pendingDeletion: boolean;
}

interface IssuedCode {
  studentName: string;
  claimCode: string;
  expiresAt: string | null;
}

interface ClassroomRosterProps {
  classroomId: string;
  joinCode: string;
  isArchived?: boolean;
}

function byName(a: RosterStudent, b: RosterStudent) {
  return a.name.localeCompare(b.name);
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data?.details && typeof data.details === 'object') {
      const first = Object.values(data.details as Record<string, string[]>)[0];
      if (Array.isArray(first) && first[0]) return first[0];
    }
    if (typeof data?.error === 'string') return data.error;
  } catch {
    // A response with no JSON body still needs to say something useful.
  }
  return fallback;
}

export default function ClassroomRoster({
  classroomId,
  joinCode,
  isArchived,
}: ClassroomRosterProps) {
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const [issuedCode, setIssuedCode] = useState<IssuedCode | null>(null);
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  // Focus goes back where it came from when the claim-code dialog closes.
  const dialogTriggerRef = useRef<HTMLElement | null>(null);

  const loadRoster = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/classrooms/${classroomId}/students`);
      if (!res.ok) {
        setLoadError(await readError(res, 'Could not load the roster.'));
        return;
      }
      const data = await res.json();
      setStudents((data.students ?? []).slice().sort(byName));
      setLoadError(null);
    } catch (error) {
      Logger.warning(LogContext.SYSTEM, 'Could not load classroom roster', { error });
      setLoadError('Could not load the roster. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const closeDialog = () => {
    setIssuedCode(null);
    dialogTriggerRef.current?.focus();
    dialogTriggerRef.current = null;
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name || isCreating) return;

    setIsCreating(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/teacher/classrooms/${classroomId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setFormError(await readError(res, 'Could not add that student.'));
        return;
      }
      const data = await res.json();
      setStudents((prev) => [...prev, data.student as RosterStudent].sort(byName));
      setNewName('');
      setStatusMessage(`${data.student.name} added to the class.`);
      dialogTriggerRef.current = nameInputRef.current;
      setIssuedCode({
        studentName: data.student.name,
        claimCode: data.claimCode,
        expiresAt: data.claimCodeExpiresAt ?? null,
      });
    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Could not create managed student', { error });
      setFormError('Could not add that student. Check your connection and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNewCode = async (student: RosterStudent, trigger: HTMLElement | null) => {
    setBusyStudentId(student.id);
    setFormError(null);
    try {
      const res = await fetch(
        `/api/teacher/classrooms/${classroomId}/students/${student.id}/claim-code`,
        { method: 'POST' },
      );
      if (!res.ok) {
        setFormError(await readError(res, 'Could not create a new claim code.'));
        return;
      }
      const data = await res.json();
      setStudents((prev) =>
        prev.map((row) =>
          row.id === student.id
            ? {
                ...row,
                hasClaimCode: true,
                claimCodeExpiresAt: data.claimCodeExpiresAt ?? null,
                claimCodeExpired: false,
              }
            : row,
        ),
      );
      dialogTriggerRef.current = trigger;
      setIssuedCode({
        studentName: data.student.name,
        claimCode: data.claimCode,
        expiresAt: data.claimCodeExpiresAt ?? null,
      });
    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Could not mint a claim code', { error });
      setFormError('Could not create a new claim code. Check your connection and try again.');
    } finally {
      setBusyStudentId(null);
    }
  };

  const handleRemove = async (student: RosterStudent) => {
    setBusyStudentId(student.id);
    setFormError(null);
    try {
      const res = await fetch(
        `/api/teacher/classrooms/${classroomId}/students/${student.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        setFormError(await readError(res, 'Could not remove that student.'));
        return;
      }
      setStudents((prev) => prev.filter((row) => row.id !== student.id));
      setConfirmRemoveId(null);
      setStatusMessage(`${student.name} removed from the class. The account still exists.`);
    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Could not remove a student from a classroom', { error });
      setFormError('Could not remove that student. Check your connection and try again.');
    } finally {
      setBusyStudentId(null);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow overflow-hidden" aria-labelledby="roster-heading">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <UserGroupIcon className="h-5 w-5 text-gray-600" aria-hidden="true" />
        <h2 id="roster-heading" className="text-base font-semibold text-gray-900">
          Students ({students.length})
        </h2>
      </div>

      {/* Add a student */}
      {!isArchived && (
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="new-student-name" className="block text-sm font-medium text-gray-900">
                Add a student
              </label>
              <input
                ref={nameInputRef}
                id="new-student-name"
                type="text"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                maxLength={80}
                aria-describedby="new-student-hint"
                className="mt-1 w-full min-h-11 px-3 py-2 border border-gray-300 rounded-lg text-base text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                placeholder="Student name"
              />
            </div>
            <button
              type="submit"
              disabled={isCreating || newName.trim().length < 2}
              className="sm:self-end min-h-12 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
              {isCreating ? 'Adding...' : 'Add student'}
            </button>
          </form>
          <p id="new-student-hint" className="mt-2 text-sm text-gray-700">
            A name is all you need, and all we store. The account has no email address and no
            password, so the student cannot sign in, study at home, or see their own progress.
            You study with them from this roster. When they claim the account with the code we
            show you, it becomes theirs and their whole history comes with it.
          </p>
          {formError && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {formError}
            </p>
          )}
        </div>
      )}

      {/* Always mounted, because a live region added at the same moment as its
          text is often not announced at all. It only takes up space once it has
          something to say. */}
      <p
        role="status"
        aria-live="polite"
        className={
          statusMessage
            ? 'px-4 sm:px-6 py-2 text-sm text-green-800 bg-green-50 border-b border-green-100'
            : 'sr-only'
        }
      >
        {statusMessage}
      </p>

      {isLoading ? (
        <div role="status" className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-sm text-gray-700">Loading the roster...</p>
        </div>
      ) : loadError ? (
        <p role="alert" className="p-6 text-center text-sm text-red-700">
          {loadError}
        </p>
      ) : students.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-700">
          <p>No students yet.</p>
          <p className="mt-1">
            Add them by name above, or share the join code <strong>{joinCode}</strong> with
            students who have their own account.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {students.map((student) => {
            const isBusy = busyStudentId === student.id;
            const canMintCode = student.isManaged && student.managedByYou && !isArchived;
            return (
              <li key={student.id} className="px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{student.name}</p>
                    {student.isManaged ? (
                      <>
                        <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
                          Class account, not claimed yet
                        </span>
                        <p className="mt-1 text-xs text-gray-700">
                          {student.hasClaimCode && !student.claimCodeExpired
                            ? 'A claim code is waiting to be used.'
                            : student.claimCodeExpired
                              ? 'The claim code has expired. Create a new one.'
                              : 'No claim code right now. Create one when the student is ready.'}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-700">
                        {student.email ?? student.username ?? 'Signed up on their own'}
                      </p>
                    )}
                    {student.pendingDeletion && (
                      <p className="mt-1 text-xs text-red-700">
                        This account is scheduled for deletion.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/study?studentId=${encodeURIComponent(student.id)}`}
                      className="min-h-11 inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      <PlayIcon className="h-4 w-4" aria-hidden="true" />
                      Start session
                      <span className="sr-only"> with {student.name}</span>
                    </Link>

                    {canMintCode && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={(event) => handleNewCode(student, event.currentTarget)}
                        className="min-h-11 inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-900 rounded-lg hover:bg-gray-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        <KeyIcon className="h-4 w-4" aria-hidden="true" />
                        New claim code
                        <span className="sr-only"> for {student.name}</span>
                      </button>
                    )}

                    {confirmRemoveId === student.id ? (
                      <span className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRemove(student)}
                          className="min-h-11 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                        >
                          {isBusy ? 'Removing...' : 'Confirm remove'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(null)}
                          className="min-h-11 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-900 rounded-lg hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(student.id)}
                        className="min-h-11 inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm font-medium text-gray-900 rounded-lg hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        Remove
                        <span className="sr-only"> {student.name} from this class</span>
                      </button>
                    )}
                  </div>
                </div>

                {confirmRemoveId === student.id && (
                  <p className="mt-2 text-xs text-gray-700">
                    Removing takes {student.name} off this roster. The account and everything
                    they have studied stay, and you stop being able to study with them.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {issuedCode && (
        <ClaimCodeDialog
          studentName={issuedCode.studentName}
          claimCode={issuedCode.claimCode}
          expiresAt={issuedCode.expiresAt}
          onDismiss={closeDialog}
        />
      )}
    </section>
  );
}
