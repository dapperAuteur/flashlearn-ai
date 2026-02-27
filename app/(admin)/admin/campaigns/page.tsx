'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Mail,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
} from 'lucide-react';

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  segment: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const SEGMENT_LABELS: Record<string, string> = {
  all: 'All Users',
  'free-tier': 'Free Tier',
  paid: 'Paid',
  'inactive-7d': 'Inactive 7d',
  'inactive-30d': 'Inactive 30d',
  'no-sets': 'No Sets',
  'no-study': 'No Study',
};

function getStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700';
    case 'sending':
      return 'bg-yellow-100 text-yellow-700';
    case 'sent':
      return 'bg-green-100 text-green-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'draft':
      return <Mail className="h-3.5 w-3.5" />;
    case 'sending':
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    case 'sent':
      return <CheckCircle className="h-3.5 w-3.5" />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

export default function AdminCampaignsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const user = session?.user as { role?: string } | undefined;

  const fetchCampaigns = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      const res = await fetch(`/api/admin/campaigns?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setPagination(data.pagination);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'Admin') {
      fetchCampaigns();
    } else if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, user?.role, router, fetchCampaigns]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"? This action cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete campaign');
        return;
      }
      fetchCampaigns(pagination.page);
    } catch {
      setError('Failed to delete campaign');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || (status === 'authenticated' && loading && campaigns.length === 0)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage email campaigns for your users
          </p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Campaign
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {campaigns.length === 0 && !loading ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No campaigns yet. Create one to get started.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="md:hidden space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign._id}
                className={`bg-white rounded-lg shadow border border-gray-100 p-4 ${
                  deleting === campaign._id ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {campaign.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {campaign.subject}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${getStatusBadge(
                      campaign.status
                    )}`}
                  >
                    {getStatusIcon(campaign.status)}
                    {campaign.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 mt-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {SEGMENT_LABELS[campaign.segment] || campaign.segment}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {campaign.recipientCount || 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(campaign.sentAt || campaign.createdAt)}
                  </span>
                </div>

                {campaign.status === 'sent' && (
                  <div className="flex gap-4 text-xs text-gray-500 mt-2">
                    <span className="text-green-600">
                      {campaign.sentCount} sent
                    </span>
                    {campaign.failedCount > 0 && (
                      <span className="text-red-600">
                        {campaign.failedCount} failed
                      </span>
                    )}
                  </div>
                )}

                {campaign.status === 'draft' && (
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/admin/campaigns/new?edit=${campaign._id}`}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(campaign._id, campaign.name)}
                      disabled={deleting === campaign._id}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Campaign
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Segment
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Recipients
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Sent / Failed
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Date
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign._id}
                    className={`hover:bg-gray-50 ${
                      deleting === campaign._id ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-gray-500">{campaign.subject}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                        {SEGMENT_LABELS[campaign.segment] || campaign.segment}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(
                          campaign.status
                        )}`}
                      >
                        {getStatusIcon(campaign.status)}
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {campaign.recipientCount || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {campaign.status === 'sent' || campaign.status === 'sending' ? (
                        <span>
                          <span className="text-green-600">{campaign.sentCount}</span>
                          {campaign.failedCount > 0 && (
                            <>
                              {' / '}
                              <span className="text-red-600">{campaign.failedCount}</span>
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(campaign.sentAt || campaign.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {campaign.status === 'draft' && (
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/campaigns/new?edit=${campaign._id}`}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(campaign._id, campaign.name)}
                            disabled={deleting === campaign._id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchCampaigns(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </button>
                <button
                  onClick={() => fetchCampaigns(pagination.page + 1)}
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
