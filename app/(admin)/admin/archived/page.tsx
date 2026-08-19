'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, UserPlus, X } from 'lucide-react';

type ContainerKind = 'classroom' | 'team' | 'school';

interface FormerOwner {
  id: string;
  name: string;
  email: string;
  role: string;
  pendingDeletion: boolean;
  suspended: boolean;
  canReclaim: boolean;
}

interface ArchivedContainer {
  id: string;
  kind: ContainerKind;
  name: string;
  memberCount: number;
  teacherCount?: number;
  studentCount?: number;
  code: string | null;
  lastChangedAt: string | null;
  formerOwnerId: string | null;
  formerOwner: FormerOwner | null;
}

const KIND_LABEL: Record<ContainerKind, string> = {
  classroom: 'Classroom',
  team: 'Study group',
  school: 'School',
};

const KIND_BADGE: Record<ContainerKind, string> = {
  classroom: 'bg-blue-100 text-blue-700',
  team: 'bg-purple-100 text-purple-700',
  school: 'bg-emerald-100 text-emerald-700',
};

function membersText(container: ArchivedContainer): string {
  if (container.kind === 'classroom') {
    return `${container.memberCount} ${container.memberCount === 1 ? 'student' : 'students'}`;
  }
  if (container.kind === 'team') {
    return `${container.memberCount} ${container.memberCount === 1 ? 'member' : 'members'}`;
  }
  return `${container.teacherCount ?? 0} teachers, ${container.studentCount ?? 0} students`;
}

function whenText(iso: string | null): string {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminArchivedContainersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [containers, setContainers] = useState<ArchivedContainer[]>([]);
  const [eligibleRoles, setEligibleRoles] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [ownerInput, setOwnerInput] = useState('');
  const [saving, setSaving] = useState(false);

  const user = session?.user as { role?: string } | undefined;

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/archived-containers');
      if (res.ok) {
        const data = await res.json();
        setContainers(data.containers || []);
        setEligibleRoles(data.eligibleRoles || {});
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to load archived containers (${res.status})`);
      }
    } catch {
      setError('Failed to load archived containers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'Admin') {
      fetchContainers();
    } else if (status === 'authenticated') {
      router.push('/flashcards');
    }
  }, [status, user?.role, router, fetchContainers]);

  const rowKey = (container: ArchivedContainer) => `${container.kind}:${container.id}`;

  const patchContainer = async (
    container: ArchivedContainer,
    body: { newOwnerId?: string; newOwnerEmail?: string },
    successText: string,
  ) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(
        `/api/admin/archived-containers/${container.kind}/${container.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotice(successText);
        setOpenRow(null);
        setOwnerInput('');
        fetchContainers();
      } else {
        setError(data.error || `Failed to update ${KIND_LABEL[container.kind].toLowerCase()}`);
      }
    } catch {
      setError('Failed to reach the server. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReassign = (container: ArchivedContainer) => {
    const value = ownerInput.trim();
    if (!value) {
      setError('Enter the new owner’s email address or user id.');
      return;
    }
    const body = value.includes('@') ? { newOwnerEmail: value } : { newOwnerId: value };

    patchContainer(
      container,
      body,
      `${container.name} now belongs to ${value} and is no longer archived.`,
    );
  };

  const handleUnarchive = (container: ArchivedContainer) => {
    patchContainer(
      container,
      {},
      `${container.name} is no longer archived. Its owner did not change.`,
    );
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="sr-only">Loading archived containers</span>
      </div>
    );
  }

  const renderOwner = (container: ArchivedContainer) => {
    const owner = container.formerOwner;
    if (!owner) {
      return (
        <div>
          <p className="text-sm text-gray-700">Former owner: account deleted</p>
          {container.formerOwnerId && (
            <p className="text-xs text-gray-500 font-mono break-all">{container.formerOwnerId}</p>
          )}
        </div>
      );
    }
    return (
      <div>
        <p className="text-sm text-gray-900">{owner.name || owner.email || owner.id}</p>
        <p className="text-xs text-gray-500 break-all">
          {owner.email}
          {owner.role ? ` · ${owner.role}` : ''}
        </p>
        {owner.pendingDeletion && (
          <p className="text-xs text-amber-700">Deletion pending</p>
        )}
        {owner.suspended && <p className="text-xs text-amber-700">Suspended</p>}
      </div>
    );
  };

  const renderForm = (container: ArchivedContainer) => {
    const roles = eligibleRoles[container.kind] || [];
    const inputId = `new-owner-${container.kind}-${container.id}`;
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          New owner email or user id
        </label>
        <input
          id={inputId}
          type="text"
          value={ownerInput}
          onChange={(e) => setOwnerInput(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
          placeholder="teacher@school.edu"
          aria-describedby={`${inputId}-hint`}
        />
        <p id={`${inputId}-hint`} className="text-xs text-gray-600 mt-1">
          {roles.length
            ? `Allowed roles: ${roles.join(', ')}. The account cannot be suspended or waiting to be deleted.`
            : 'The account cannot be suspended or waiting to be deleted.'}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={() => handleReassign(container)}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Reassigning...' : 'Reassign and unarchive'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpenRow(null);
              setOwnerInput('');
            }}
            className="px-4 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Archived containers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Classrooms, study groups, and schools that were frozen when their owner deleted their
          account. Members can still read and study what is already inside. Give one a new owner to
          unfreeze it.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between"
        >
          <span className="text-sm">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="bg-green-50 text-green-800 px-4 py-3 rounded-lg mb-4 flex items-center justify-between"
        >
          <span className="text-sm">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            className="text-green-600 hover:text-green-800"
            aria-label="Dismiss message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {containers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Archive className="h-12 w-12 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-500">
            Nothing is archived. Containers land here when the account that owned them is deleted.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">
                Archived classrooms, study groups, and schools waiting for a new owner
              </caption>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Name</th>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Kind</th>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">People</th>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Last change</th>
                  <th scope="col" className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Former owner</th>
                  <th scope="col" className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {containers.map((container) => (
                  <tr key={rowKey(container)} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 text-sm">{container.name}</span>
                      {container.code && (
                        <span className="block text-xs text-gray-500 font-mono">{container.code}</span>
                      )}
                      {openRow === rowKey(container) && renderForm(container)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${KIND_BADGE[container.kind]}`}>
                        {KIND_LABEL[container.kind]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{membersText(container)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{whenText(container.lastChangedAt)}</td>
                    <td className="px-4 py-3">{renderOwner(container)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenRow(openRow === rowKey(container) ? null : rowKey(container));
                            setOwnerInput('');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                          aria-expanded={openRow === rowKey(container)}
                        >
                          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                          Reassign
                        </button>
                        {container.formerOwner?.canReclaim && (
                          <button
                            type="button"
                            onClick={() => handleUnarchive(container)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" />
                            Unarchive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {containers.map((container) => (
              <div key={rowKey(container)} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-medium text-gray-900">{container.name}</span>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${KIND_BADGE[container.kind]}`}>
                    {KIND_LABEL[container.kind]}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{membersText(container)}</p>
                <p className="text-xs text-gray-500">Last change: {whenText(container.lastChangedAt)}</p>
                <div className="mt-2">{renderOwner(container)}</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenRow(openRow === rowKey(container) ? null : rowKey(container));
                      setOwnerInput('');
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    aria-expanded={openRow === rowKey(container)}
                  >
                    Reassign
                  </button>
                  {container.formerOwner?.canReclaim && (
                    <button
                      type="button"
                      onClick={() => handleUnarchive(container)}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      Unarchive
                    </button>
                  )}
                </div>
                {openRow === rowKey(container) && renderForm(container)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
