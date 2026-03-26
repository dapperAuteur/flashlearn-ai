"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { adminLogger, AdminLogContext } from "@/lib/logging/admin-logger";
import { DollarSign, TrendingUp, Users, CreditCard, Plus, Power } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

interface RevenueData {
  mrr: number;
  activeSubscriptions: Record<string, number>;
  totalActiveSubscribers: number;
  churnRate: number;
  recentTransactions: RecentTransaction[];
  mrrTrend: { month: string; mrr: number }[];
  lifetimeRevenue: number;
}

interface RecentTransaction {
  _id: string;
  userId?: string;
  stripeCustomerId?: string;
  eventType: string;
  previousTier?: string;
  newTier?: string;
  amountCents: number;
  currency: string;
  stripeEventId: string;
  createdAt: string;
}

const EVENT_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  subscription_created: { bg: "bg-green-100", text: "text-green-800", label: "Subscribed" },
  upgraded: { bg: "bg-blue-100", text: "text-blue-800", label: "Upgraded" },
  downgraded: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Downgraded" },
  canceled: { bg: "bg-red-100", text: "text-red-800", label: "Canceled" },
  payment_succeeded: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Payment" },
  payment_failed: { bg: "bg-red-100", text: "text-red-800", label: "Failed" },
  refund: { bg: "bg-orange-100", text: "text-orange-800", label: "Refund" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function AdminRevenuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lifetimeData, setLifetimeData] = useState<{ totalLifetime: number; remaining: number; cap: number } | null>(null);

  // Promo campaign state
  interface PromoCampaign {
    _id: string;
    name: string;
    tier: string;
    priceDisplay: string;
    priceCents: number;
    userCap: number;
    redemptions: number;
    isActive: boolean;
    startDate: string;
    endDate?: string;
  }
  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([]);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    tier: 'Lifetime Learner',
    priceDisplay: '$103.29',
    priceCents: 10329,
    userCap: 100,
  });
  const [savingCampaign, setSavingCampaign] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/promo-campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch { /* non-critical */ }
  }, []);

  const toggleCampaign = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/promo-campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive }),
    });
    fetchCampaigns();
  };

  const createCampaign = async () => {
    setSavingCampaign(true);
    try {
      const res = await fetch('/api/admin/promo-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign),
      });
      if (res.ok) {
        setShowNewCampaign(false);
        setNewCampaign({ name: '', tier: 'Lifetime Learner', priceDisplay: '$103.29', priceCents: 10329, userCap: 100 });
        fetchCampaigns();
      }
    } catch { /* non-critical */ }
    setSavingCampaign(false);
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "Admin") {
      adminLogger.warn(AdminLogContext.DASHBOARD, "Unauthorized access to revenue page, redirecting.");
      router.push("/dashboard");
      return;
    }

    const fetchRevenue = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/analytics/revenue");
        if (!response.ok) throw new Error("Failed to fetch revenue data");
        const json = await response.json();
        setData(json);
      } catch (err) {
        adminLogger.error(AdminLogContext.DASHBOARD, "Error fetching revenue data", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();

    // Fetch lifetime promo counter
    fetch("/api/admin/analytics/lifetime")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setLifetimeData(d); })
      .catch(() => {});

    fetchCampaigns();
  }, [session, status, router, fetchCampaigns]);

  if (loading || status === "loading") {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-3 text-gray-500 text-sm">Loading revenue data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 rounded-md">{error}</div>
    );
  }

  if (!data) return null;

  // MRR Trend Line Chart Data
  const mrrTrendData = {
    labels: data.mrrTrend.map((d) => d.month),
    datasets: [
      {
        label: "MRR",
        data: data.mrrTrend.map((d) => d.mrr),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "rgb(59, 130, 246)",
      },
    ],
  };

  const mrrChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { y: number } }) => {
            return `MRR: ${formatCurrency(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 11 },
          callback: (value: string | number) => {
            return `$${Number(value).toLocaleString()}`;
          },
        },
      },
    },
  };

  // Tier Breakdown Doughnut Chart
  const tierLabels = Object.keys(data.activeSubscriptions);
  const tierValues = Object.values(data.activeSubscriptions);
  const tierColors = [
    "rgba(59, 130, 246, 0.8)",   // Monthly Pro - blue
    "rgba(16, 185, 129, 0.8)",   // Annual Pro - green
    "rgba(139, 92, 246, 0.8)",   // Lifetime Learner - purple
  ];
  const tierBorderColors = [
    "rgb(59, 130, 246)",
    "rgb(16, 185, 129)",
    "rgb(139, 92, 246)",
  ];

  const tierDoughnutData = {
    labels: tierLabels,
    datasets: [
      {
        data: tierValues,
        backgroundColor: tierColors,
        borderColor: tierBorderColors,
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Revenue Dashboard</h1>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(data.mrr)}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          color="text-green-600"
        />
        <StatCard
          title="Active Subscriptions"
          value={data.totalActiveSubscribers.toLocaleString()}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          color="text-blue-600"
        />
        <StatCard
          title="Churn Rate (30d)"
          value={`${data.churnRate}%`}
          icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
          color={data.churnRate > 5 ? "text-red-600" : "text-orange-500"}
        />
        <StatCard
          title="Lifetime Revenue"
          value={formatCurrency(data.lifetimeRevenue)}
          icon={<CreditCard className="h-5 w-5 text-purple-600" />}
          color="text-purple-600"
        />
      </div>

      {/* Lifetime Promo Tracker */}
      {lifetimeData && (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6" role="region" aria-label="Lifetime promo tracker">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Lifetime Promo Tracker</h2>
              <p className="text-xs text-gray-500">$103.29 introductory price — first 100 users</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600">{lifetimeData.totalLifetime} <span className="text-sm font-normal text-gray-500">/ {lifetimeData.cap}</span></p>
              <p className="text-xs text-gray-500">{lifetimeData.remaining} spots remaining</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3" role="progressbar" aria-valuenow={lifetimeData.totalLifetime} aria-valuemin={0} aria-valuemax={lifetimeData.cap}>
            <div
              className={`h-3 rounded-full transition-all ${lifetimeData.remaining <= 10 ? 'bg-red-500' : lifetimeData.remaining <= 30 ? 'bg-amber-500' : 'bg-purple-500'}`}
              style={{ width: `${Math.min(100, (lifetimeData.totalLifetime / lifetimeData.cap) * 100)}%` }}
            />
          </div>
          {lifetimeData.remaining === 0 && (
            <p className="mt-2 text-sm text-red-600 font-medium">Promo cap reached — time to switch to annual pricing.</p>
          )}
        </div>
      )}

      {/* Promo Campaigns */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6" role="region" aria-label="Promo campaigns">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Membership Campaigns</h2>
            <p className="text-xs text-gray-500">Create and manage promotional pricing campaigns</p>
          </div>
          <button
            onClick={() => setShowNewCampaign(!showNewCampaign)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            aria-label="Create new campaign"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Campaign
          </button>
        </div>

        {/* New Campaign Form */}
        {showNewCampaign && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="campaign-name" className="block text-xs font-medium text-gray-700 mb-1">Campaign Name</label>
                <input
                  id="campaign-name"
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g., Spring 2026 Lifetime Launch"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label htmlFor="campaign-tier" className="block text-xs font-medium text-gray-700 mb-1">Tier</label>
                <select
                  id="campaign-tier"
                  value={newCampaign.tier}
                  onChange={(e) => setNewCampaign({ ...newCampaign, tier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="Lifetime Learner">Lifetime Learner</option>
                  <option value="Monthly Pro">Monthly Pro</option>
                  <option value="Annual Pro">Annual Pro</option>
                </select>
              </div>
              <div>
                <label htmlFor="campaign-price" className="block text-xs font-medium text-gray-700 mb-1">Display Price</label>
                <input
                  id="campaign-price"
                  type="text"
                  value={newCampaign.priceDisplay}
                  onChange={(e) => setNewCampaign({ ...newCampaign, priceDisplay: e.target.value })}
                  placeholder="$103.29"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label htmlFor="campaign-cents" className="block text-xs font-medium text-gray-700 mb-1">Price (cents)</label>
                <input
                  id="campaign-cents"
                  type="number"
                  value={newCampaign.priceCents}
                  onChange={(e) => setNewCampaign({ ...newCampaign, priceCents: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label htmlFor="campaign-cap" className="block text-xs font-medium text-gray-700 mb-1">User Cap</label>
                <input
                  id="campaign-cap"
                  type="number"
                  value={newCampaign.userCap}
                  onChange={(e) => setNewCampaign({ ...newCampaign, userCap: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createCampaign}
                disabled={savingCampaign || !newCampaign.name}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {savingCampaign ? 'Creating...' : 'Create Campaign'}
              </button>
              <button
                onClick={() => setShowNewCampaign(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Campaign List */}
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No campaigns yet. Create one to start a promotion.</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c._id} className={`border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${c.isActive ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {c.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.tier} &middot; {c.priceDisplay} &middot; {c.redemptions}/{c.userCap} redeemed
                    {c.endDate && ` · Ends ${new Date(c.endDate).toLocaleDateString()}`}
                  </p>
                  {/* Mini progress bar */}
                  <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 mt-1.5">
                    <div
                      className={`h-1.5 rounded-full ${c.redemptions >= c.userCap ? 'bg-red-500' : 'bg-purple-500'}`}
                      style={{ width: `${Math.min(100, (c.redemptions / c.userCap) * 100)}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => toggleCampaign(c._id, !c.isActive)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    c.isActive
                      ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                      : 'text-green-700 bg-green-100 hover:bg-green-200'
                  }`}
                  aria-label={c.isActive ? `Pause ${c.name}` : `Activate ${c.name}`}
                >
                  <Power className="h-3.5 w-3.5" aria-hidden="true" />
                  {c.isActive ? 'Pause' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Trend Line Chart */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
            MRR Trend (12 months)
          </h2>
          <div className="h-72">
            {data.mrrTrend.length > 0 ? (
              <Line data={mrrTrendData} options={mrrChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                No MRR data available
              </div>
            )}
          </div>
        </div>

        {/* Tier Breakdown Doughnut Chart */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
            Tier Breakdown
          </h2>
          <div className="h-72">
            {data.totalActiveSubscribers > 0 ? (
              <Doughnut data={tierDoughnutData} options={doughnutOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                No active subscriptions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">
            Recent Transactions
          </h2>
        </div>

        {data.recentTransactions.length === 0 ? (
          <div className="px-4 sm:px-6 py-8 text-center text-gray-600 text-sm">
            No transactions recorded yet
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {data.recentTransactions.map((tx) => {
                const style = EVENT_TYPE_STYLES[tx.eventType] || {
                  bg: "bg-gray-100",
                  text: "text-gray-800",
                  label: tx.eventType,
                };
                return (
                  <div key={tx._id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(tx.amountCents / 100)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-gray-500 truncate max-w-[160px]">
                        {tx.userId || tx.stripeCustomerId || "N/A"}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      User / Customer ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.recentTransactions.map((tx) => {
                    const style = EVENT_TYPE_STYLES[tx.eventType] || {
                      bg: "bg-gray-100",
                      text: "text-gray-800",
                      label: tx.eventType,
                    };
                    return (
                      <tr key={tx._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {formatCurrency(tx.amountCents / 100)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono truncate max-w-[200px]">
                          {tx.userId || tx.stripeCustomerId || "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const StatCard = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="px-3 py-4 sm:p-5">
      <div className="flex items-center justify-between mb-1">
        <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</dt>
        {icon}
      </div>
      <dd className={`mt-1 text-xl sm:text-2xl font-semibold ${color || "text-gray-900"}`}>
        {value}
      </dd>
    </div>
  </div>
);
