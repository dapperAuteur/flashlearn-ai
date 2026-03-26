'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  Monitor,
  Smartphone,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import {
  getConflicts,
  removeConflict,
  type SyncConflict,
} from '@/lib/db/indexeddb';

type Resolution = 'local' | 'server';

export default function ConflictsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const loadConflicts = useCallback(async () => {
    try {
      const items = await getConflicts();
      setConflicts(items);
    } catch (err) {
      console.error('Failed to load conflicts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    loadConflicts();
  }, [session, status, router, loadConflicts]);

  const handleResolve = async (conflict: SyncConflict, resolution: Resolution) => {
    setResolving(conflict.id);
    try {
      const dataToSave = resolution === 'local' ? conflict.localData : conflict.serverData;

      // Push the chosen version to the server
      const res = await fetch(`/api/sets/${conflict.entityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dataToSave, forceResolve: true }),
      });

      if (res.ok || res.status === 409) {
        // Remove conflict from queue regardless — user made their choice
        await removeConflict(conflict.id);
        setConflicts((prev) => prev.filter((c) => c.id !== conflict.id));
      }
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
    } finally {
      setResolving(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading conflicts">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
        <span className="sr-only">Loading conflicts...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden="true" />
            Sync Conflicts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            These items were edited both locally and on the server. Choose which version to keep.
          </p>
        </div>
      </div>

      {conflicts.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center" role="status">
          <Check className="h-8 w-8 text-green-600 mx-auto mb-2" aria-hidden="true" />
          <p className="text-green-800 font-medium">No conflicts to resolve</p>
          <p className="text-green-600 text-sm mt-1">All your data is in sync.</p>
        </div>
      ) : (
        <div className="space-y-6" role="list" aria-label="Sync conflicts">
          {conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              onResolve={handleResolve}
              isResolving={resolving === conflict.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConflictCard({
  conflict,
  onResolve,
  isResolving,
}: {
  conflict: SyncConflict;
  onResolve: (conflict: SyncConflict, resolution: Resolution) => void;
  isResolving: boolean;
}) {
  const diffFields = getDiffFields(conflict.localData, conflict.serverData);

  return (
    <div
      className="bg-white border border-amber-200 rounded-lg shadow-sm overflow-hidden"
      role="listitem"
      aria-label={`Conflict for ${conflict.entityTitle}`}
    >
      {/* Card header */}
      <div className="bg-amber-50 px-4 py-3 border-b border-amber-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900">{conflict.entityTitle}</h3>
            <p className="text-xs text-gray-500">
              {conflict.entity === 'set' ? 'Flashcard Set' : 'Flashcard'} &middot; Detected{' '}
              {new Date(conflict.detectedAt).toLocaleDateString()}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-md">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Conflict
          </span>
        </div>
      </div>

      {/* Side-by-side diff */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {/* Local version */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-blue-700">Your Local Version</h4>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Modified {formatDate(conflict.localUpdatedAt)}
          </p>
          <div className="space-y-2">
            {diffFields.map((field) => (
              <DiffField
                key={field.key}
                label={field.key}
                value={field.local}
                isChanged={field.local !== field.server}
                variant="local"
              />
            ))}
          </div>
        </div>

        {/* Server version */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="h-4 w-4 text-green-600" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-green-700">Server Version</h4>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Modified {formatDate(conflict.serverUpdatedAt)}
          </p>
          <div className="space-y-2">
            {diffFields.map((field) => (
              <DiffField
                key={field.key}
                label={field.key}
                value={field.server}
                isChanged={field.local !== field.server}
                variant="server"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Resolution buttons */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={() => onResolve(conflict, 'local')}
            disabled={isResolving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Keep your local version"
          >
            {isResolving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Smartphone className="h-4 w-4" aria-hidden="true" />
            )}
            Keep Local
          </button>
          <button
            onClick={() => onResolve(conflict, 'server')}
            disabled={isResolving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Keep the server version"
          >
            {isResolving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Monitor className="h-4 w-4" aria-hidden="true" />
            )}
            Keep Server
          </button>
        </div>
      </div>
    </div>
  );
}

function DiffField({
  label,
  value,
  isChanged,
  variant,
}: {
  label: string;
  value: string;
  isChanged: boolean;
  variant: 'local' | 'server';
}) {
  const highlightClass = isChanged
    ? variant === 'local'
      ? 'bg-blue-50 border-blue-200'
      : 'bg-green-50 border-green-200'
    : 'bg-gray-50 border-gray-200';

  return (
    <div className={`border rounded-md p-2 ${highlightClass}`}>
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900 break-words">
        {typeof value === 'string' ? value : JSON.stringify(value)}
      </p>
    </div>
  );
}

function getDiffFields(
  local: Record<string, unknown>,
  server: Record<string, unknown>
): { key: string; local: string; server: string }[] {
  const displayFields = ['title', 'description', 'isPublic', 'cardCount', 'front', 'back'];
  const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);

  return Array.from(allKeys)
    .filter((key) => displayFields.includes(key))
    .map((key) => ({
      key,
      local: String(local[key] ?? ''),
      server: String(server[key] ?? ''),
    }));
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}
