'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  HeartPulse,
  AlertTriangle,
  Mail,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Send,
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface HealthFactors {
  loginRecency: number;
  studyFrequency: number;
  contentCreation: number;
  engagementDepth: number;
  subscriptionStatus: number;
}

interface HealthDetails {
  daysSinceLastLogin: number;
  studySessionsLast30d: number;
  setsCreatedLast30d: number;
  avgAccuracy: number;
  subscriptionTier: string;
}

interface HealthResult {
  score: number;
  riskLevel: 'healthy' | 'at-risk' | 'churning';
  factors: HealthFactors;
  details: HealthDetails;
}

interface UserWithHealth {
  _id: string;
  name: string;
  email: string;
  subscriptionTier: string;
  createdAt: string;
  health: HealthResult | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Summary {
  healthy: number;
  atRisk: number;
  churning: number;
  total: number;
}

type RiskFilter = 'all' | 'healthy' | 'at-risk' | 'churning';
type TemplateType = 'we-miss-you' | 'new-features' | 'study-reminder';

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
  { value: 'we-miss-you', label: 'We Miss You', description: 'Warm message encouraging the user to come back' },
  { value: 'new-features', label: 'New Features', description: 'Highlight recent platform improvements' },
  { value: 'study-reminder', label: 'Study Reminder', description: 'Gentle nudge about spaced repetition' },
];

function getTierBadgeColor(tier: string): string {
  switch (tier) {
    case 'Lifetime Learner': return 'bg-purple-100 text-purple-700';
    case 'Annual Pro': return 'bg-blue-100 text-blue-700';
    case 'Monthly Pro': return 'bg-cyan-100 text-cyan-700';
    case 'Free': return 'bg-gray-100 text-gray-600';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getScoreTextColor(score: number): string {
  if (score >= 70) return 'text-green-700';
  if (score >= 40) return 'text-yellow-700';
  return 'text-red-700';
}

function getRiskBadge(riskLevel: string): string {
  switch (riskLevel) {
    case 'healthy': return 'bg-green-100 text-green-700';
    case 'at-risk': return 'bg-yellow-100 text-yellow-700';
    case 'churning': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function AdminHealthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserWithHealth[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState<Summary>({ healthy: 0, atRisk: 0, churning: 0, total: 0 });
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Re-engage modal state
  const [reengageUser, setReengageUser] = useState<UserWithHealth | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('we-miss-you');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const user = session?.user as { role?: string } | undefined;

  const fetchHealth = useCallback(async (page = 1, risk: RiskFilter = 'all') => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        risk,
      });
      const res = await fetch(`/api/admin/users/health?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch health data');
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(data.pagination);
      setSummary(data.summary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'Admin') {
      fetchHealth(1, riskFilter);
    } else if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, user?.role, router, fetchHealth, riskFilter]);

  const handleFilterChange = (filter: RiskFilter) => {
    setRiskFilter(filter);
    fetchHealth(1, filter);
  };

  const handlePageChange = (page: number) => {
    fetchHealth(page, riskFilter);
  };

  const handleSendReengage = async () => {
    if (!reengageUser) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/admin/users/${reengageUser._id}/reengage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selectedTemplate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendResult({ success: false, message: data.error || 'Failed to send email' });
      } else {
        setSendResult({ success: true, message: data.message || 'Email sent successfully' });
      }
    } catch {
      setSendResult({ success: false, message: 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  const doughnutData = {
    labels: ['Healthy', 'At-Risk', 'Churning'],
    datasets: [
      {
        data: [summary.healthy, summary.atRisk, summary.churning],
        backgroundColor: ['#22c55e', '#eab308', '#ef4444'],
        borderColor: ['#16a34a', '#ca8a04', '#dc2626'],
        borderWidth: 1,
        hoverOffset: 4,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 13 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: { label?: string; raw?: unknown }) => {
            const value = context.raw as number;
            const pct = summary.total > 0 ? ((value / summary.total) * 100).toFixed(1) : '0';
            return ` ${context.label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HeartPulse className="h-6 w-6 text-blue-600" />
          User Health Scores
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor user engagement health and send re-engagement emails to at-risk users
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary cards + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* Stat cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Healthy */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Healthy Users</span>
              <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                <HeartPulse className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.healthy}</p>
            <p className="text-xs text-green-600 mt-1">
              {summary.total > 0 ? ((summary.healthy / summary.total) * 100).toFixed(1) : '0'}% of users
            </p>
          </div>

          {/* At-Risk */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">At-Risk Users</span>
              <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.atRisk}</p>
            <p className="text-xs text-yellow-600 mt-1">
              {summary.total > 0 ? ((summary.atRisk / summary.total) * 100).toFixed(1) : '0'}% of users
            </p>
          </div>

          {/* Churning */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Churning Users</span>
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.churning}</p>
            <p className="text-xs text-red-600 mt-1">
              {summary.total > 0 ? ((summary.churning / summary.total) * 100).toFixed(1) : '0'}% of users
            </p>
          </div>
        </div>

        {/* Doughnut chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500 mb-3 text-center">Risk Distribution</p>
          <div className="h-48">
            {summary.total > 0 ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'healthy', label: 'Healthy' },
            { key: 'at-risk', label: 'At-Risk' },
            { key: 'churning', label: 'Churning' },
          ] as { key: RiskFilter; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              riskFilter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-500">Loading health scores...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No users found for this filter.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <div key={u._id} className="bg-white rounded-lg shadow border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  {u.health && (
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${getRiskBadge(u.health.riskLevel)}`}>
                      {u.health.riskLevel}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getTierBadgeColor(u.subscriptionTier)}`}>
                    {u.subscriptionTier}
                  </span>
                </div>

                {u.health && (
                  <>
                    {/* Health score bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Health Score</span>
                        <span className={`text-sm font-bold ${getScoreTextColor(u.health.score)}`}>
                          {u.health.score}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getScoreColor(u.health.score)}`}
                          style={{ width: `${u.health.score}%` }}
                        />
                      </div>
                    </div>

                    {/* Factor breakdown */}
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Login: {u.health.factors.loginRecency}</span>
                      <span>Study: {u.health.factors.studyFrequency}</span>
                      <span>Content: {u.health.factors.contentCreation}</span>
                      <span>Engage: {u.health.factors.engagementDepth}</span>
                    </div>

                    {/* Re-engage button */}
                    <button
                      onClick={() => { setReengageUser(u); setSendResult(null); }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Re-engage
                    </button>
                  </>
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
                    User
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Tier
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Health Score
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Factors
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Risk
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getTierBadgeColor(u.subscriptionTier)}`}>
                        {u.subscriptionTier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.health ? (
                        <div className="w-32">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-bold ${getScoreTextColor(u.health.score)}`}>
                              {u.health.score}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getScoreColor(u.health.score)}`}
                              style={{ width: `${u.health.score}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.health ? (
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div className="flex gap-3">
                            <span>Login: {u.health.factors.loginRecency}</span>
                            <span>Study: {u.health.factors.studyFrequency}</span>
                          </div>
                          <div className="flex gap-3">
                            <span>Content: {u.health.factors.contentCreation}</span>
                            <span>Engage: {u.health.factors.engagementDepth}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.health ? (
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getRiskBadge(u.health.riskLevel)}`}>
                          {u.health.riskLevel}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setReengageUser(u); setSendResult(null); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Re-engage
                      </button>
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
                {pagination.total > 0 && (
                  <span className="ml-1">({pagination.total} total)</span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
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

      {/* Re-engage Modal */}
      {reengageUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!sending) setReengageUser(null); }}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
            {/* Close button */}
            <button
              onClick={() => { if (!sending) setReengageUser(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              disabled={sending}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal header */}
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Send Re-engagement Email
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Send a re-engagement email to <span className="font-medium text-gray-700">{reengageUser.name}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{reengageUser.email}</p>
            </div>

            {/* Template selector */}
            <div className="space-y-2 mb-5">
              <label className="text-sm font-medium text-gray-700">Choose a template</label>
              {TEMPLATE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTemplate === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={opt.value}
                    checked={selectedTemplate === opt.value}
                    onChange={() => setSelectedTemplate(opt.value)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Result message */}
            {sendResult && (
              <div className={`mb-4 px-3 py-2 rounded-lg text-sm ${
                sendResult.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {sendResult.message}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { if (!sending) setReengageUser(null); }}
                disabled={sending}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReengage}
                disabled={sending || (sendResult?.success === true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : sendResult?.success ? (
                  'Sent!'
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
