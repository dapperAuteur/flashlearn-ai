/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Flag,
  Shield,
  AlertTriangle,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface FlagEntry {
  _id: string;
  setId: {
    _id: string;
    title: string;
    isPublic: boolean;
  } | null;
  reportedBy: {
    _id: string;
    name: string;
    email: string;
  } | null;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  reason: string;
  description?: string;
  status: string;
  adminAction?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface StatusCounts {
  pending: number;
  reviewed: number;
  dismissed: number;
  'action-taken': number;
  all: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'dismissed', label: 'Dismissed' },
  { key: 'action-taken', label: 'Action Taken' },
];

const REASON_STYLES: Record<string, string> = {
  inappropriate: 'bg-red-100 text-red-700',
  offensive: 'bg-red-100 text-red-700',
  spam: 'bg-yellow-100 text-yellow-700',
  copyright: 'bg-blue-100 text-blue-700',
  other: 'bg-gray-100 text-gray-600',
};

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Inappropriate',
  offensive: 'Offensive',
  spam: 'Spam',
  copyright: 'Copyright',
  other: 'Other',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'action-taken', label: 'Action Taken' },
];

const ACTION_OPTIONS = [
  { value: 'none', label: 'No action' },
  { value: 'set-private', label: 'Make set private' },
  { value: 'set-deleted', label: 'Delete set' },
  { value: 'user-warned', label: 'Warn user' },
  { value: 'user-suspended', label: 'Suspend user' },
];

export default function AdminFlagsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [flags, setFlags] = useState<FlagEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 1,
  });
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pending: 0, reviewed: 0, dismissed: 0, 'action-taken': 0, all: 0,
  });
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Per-flag review form state
  const [reviewForms, setReviewForms] = useState<Record<string, {
    status: string;
    adminAction: string;
    adminNotes: string;
  }>>({});

  const fetchFlags = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (activeTab) params.set('status', activeTab);

      const res = await fetch(`/api/admin/flags?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch flags');
      const data = await res.json();
      setFlags(data.flags || []);
      setPagination(data.pagination);
      setStatusCounts(data.statusCounts);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session || session.user.role !== 'Admin') {
      router.push('/dashboard');
      return;
    }
    fetchFlags();
  }, [session, authStatus, router, fetchFlags]);

  const getReviewForm = (flagId: string, flag: FlagEntry) => {
    return reviewForms[flagId] || {
      status: flag.status,
      adminAction: flag.adminAction || 'none',
      adminNotes: flag.adminNotes || '',
    };
  };

  const updateReviewForm = (flagId: string, field: string, value: string) => {
    setReviewForms(prev => ({
      ...prev,
      [flagId]: {
        ...getReviewForm(flagId, flags.find(f => f._id === flagId)!),
        [field]: value,
      },
    }));
  };

  const handleReview = async (flagId: string) => {
    const flag = flags.find(f => f._id === flagId);
    if (!flag) return;

    const form = getReviewForm(flagId, flag);

    // Confirm destructive actions
    if (form.adminAction === 'set-deleted') {
      if (!confirm('Are you sure you want to permanently delete this flashcard set? This cannot be undone.')) return;
    }
    if (form.adminAction === 'user-suspended') {
      if (!confirm('Are you sure you want to suspend this user? They will not be able to log in.')) return;
    }

    setUpdatingId(flagId);
    try {
      const res = await fetch(`/api/admin/flags/${flagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: form.status,
          adminAction: form.adminAction,
          adminNotes: form.adminNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update flag');
        return;
      }

      // Clear form state and refresh
      setReviewForms(prev => {
        const updated = { ...prev };
        delete updated[flagId];
        return updated;
      });
      fetchFlags(pagination.page);
    } catch {
      alert('Failed to update flag');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'reviewed':
        return 'bg-blue-100 text-blue-700';
      case 'dismissed':
        return 'bg-gray-100 text-gray-600';
      case 'action-taken':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (authStatus === 'loading') {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Flagged Content Queue
          </h1>
        </div>
        <span className="text-sm text-gray-500">
          {statusCounts.pending} pending review
        </span>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 bg-white rounded-lg shadow p-1 mb-4">
        {STATUS_TABS.map((tab) => {
          const count = tab.key ? statusCounts[tab.key as keyof StatusCounts] : statusCounts.all;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white'
                    : tab.key === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Loading flags...</p>
        </div>
      ) : flags.length === 0 ? (
        <div className="text-center py-16">
          <Flag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No flags found</h3>
          <p className="text-sm text-gray-500">
            {activeTab ? `No ${activeTab} flags at this time.` : 'No content has been flagged yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Flag cards */}
          <div className="space-y-4">
            {flags.map((flag) => {
              const form = getReviewForm(flag._id, flag);
              const isPending = flag.status === 'pending';

              return (
                <div
                  key={flag._id}
                  className={`bg-white rounded-lg shadow border border-gray-100 overflow-hidden ${
                    updatingId === flag._id ? 'opacity-60' : ''
                  }`}
                >
                  {/* Flag header */}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      {/* Left: flag info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Flag className="h-4 w-4 text-red-500 flex-shrink-0" />
                          {flag.setId ? (
                            <span className="font-semibold text-gray-900 truncate">
                              {flag.setId.title}
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-400 italic">
                              [Set deleted]
                            </span>
                          )}
                          {flag.setId && !flag.setId.isPublic && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                              Private
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${REASON_STYLES[flag.reason] || REASON_STYLES.other}`}>
                            {flag.reason === 'offensive' || flag.reason === 'inappropriate' ? (
                              <AlertTriangle className="h-3 w-3 mr-1" />
                            ) : null}
                            {REASON_LABELS[flag.reason] || flag.reason}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(flag.status)}`}>
                            {flag.status}
                          </span>
                          {flag.adminAction && flag.adminAction !== 'none' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              {flag.adminAction === 'set-private' && <Eye className="h-3 w-3 mr-1" />}
                              {flag.adminAction === 'set-deleted' && <Trash2 className="h-3 w-3 mr-1" />}
                              {flag.adminAction}
                            </span>
                          )}
                        </div>

                        {flag.description && (
                          <p className="text-sm text-gray-600 mb-2 bg-gray-50 p-2 rounded">
                            &ldquo;{flag.description}&rdquo;
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {flag.reportedBy && (
                            <span>
                              Reported by: <span className="font-medium text-gray-700">{flag.reportedBy.name}</span>{' '}
                              ({flag.reportedBy.email})
                            </span>
                          )}
                          <span>{formatDate(flag.createdAt)}</span>
                        </div>

                        {flag.reviewedBy && (
                          <p className="text-xs text-gray-400 mt-1">
                            Reviewed by: {flag.reviewedBy.name}
                          </p>
                        )}

                        {flag.adminNotes && !isPending && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            Notes: {flag.adminNotes}
                          </p>
                        )}
                      </div>

                      {/* Right: set link */}
                      {flag.setId && (
                        <a
                          href={`/study?setId=${flag.setId._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0"
                        >
                          View Set
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Action panel (for pending flags) */}
                  {isPending && (
                    <div className="bg-gray-50 border-t border-gray-100 p-4 sm:p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                          <select
                            value={form.status}
                            onChange={(e) => updateReviewForm(flag._id, 'status', e.target.value)}
                            disabled={updatingId === flag._id}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                          <select
                            value={form.adminAction}
                            onChange={(e) => updateReviewForm(flag._id, 'adminAction', e.target.value)}
                            disabled={updatingId === flag._id}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          >
                            {ACTION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Admin Notes</label>
                          <textarea
                            value={form.adminNotes}
                            onChange={(e) => updateReviewForm(flag._id, 'adminNotes', e.target.value)}
                            disabled={updatingId === flag._id}
                            placeholder="Optional notes..."
                            rows={1}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 resize-none"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => handleReview(flag._id)}
                          disabled={updatingId === flag._id}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updatingId === flag._id ? 'Saving...' : 'Submit Review'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchFlags(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </button>
                <button
                  onClick={() => fetchFlags(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
