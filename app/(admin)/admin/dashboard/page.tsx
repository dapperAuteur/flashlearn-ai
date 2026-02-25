"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminLogger, AdminLogContext } from "@/lib/logging/admin-logger";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

interface DashboardStats {
  totalUsers: number;
  newUsers24h: number;
  totalLogins: number;
  failedLogins24h: number;
  suspiciousActivity24h: number;
  paidUsers: number;
  tierCounts: Record<string, number>;
  totalFlashcardSets: number;
  totalStudySessions: number;
  studySessions24h: number;
}

interface ChartDataPoint {
  date: string;
  count: number;
}

interface RecentSignup {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  subscriptionTier: string;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([]);
  const [sessionsPerDay, setSessionsPerDay] = useState<ChartDataPoint[]>([]);
  const [signupsPerDay, setSignupsPerDay] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "Admin") {
      adminLogger.warn(AdminLogContext.DASHBOARD, "Unauthorized access, redirecting.");
      router.push("/dashboard");
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/analytics");
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data.stats);
        setRecentSignups(data.recentSignups || []);
        setSessionsPerDay(data.charts?.sessionsPerDay || []);
        setSignupsPerDay(data.charts?.signupsPerDay || []);
      } catch (err) {
        adminLogger.error(AdminLogContext.DASHBOARD, "Error fetching dashboard stats", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session, status, router]);

  if (loading || status === "loading") {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-3 text-gray-500 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 rounded-md">{error}</div>
    );
  }

  const tierCounts = stats?.tierCounts || {};

  // Chart configs
  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const userGrowthData = {
    labels: signupsPerDay.map((d) => formatDateLabel(d.date)),
    datasets: [
      {
        label: "New Users",
        data: signupsPerDay.map((d) => d.count),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  };

  const studyActivityData = {
    labels: sessionsPerDay.map((d) => formatDateLabel(d.date)),
    datasets: [
      {
        label: "Study Sessions",
        data: sessionsPerDay.map((d) => d.count),
        backgroundColor: "rgba(16, 185, 129, 0.7)",
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 10, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, font: { size: 11 } },
      },
    },
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        <StatCard title="Total Users" value={stats?.totalUsers} />
        <StatCard title="New Users (24h)" value={stats?.newUsers24h} />
        <StatCard title="Paid Users" value={stats?.paidUsers} color="text-green-600" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        <StatCard title="Total Sets" value={stats?.totalFlashcardSets} color="text-blue-600" />
        <StatCard title="Study Sessions" value={stats?.totalStudySessions} color="text-emerald-600" />
        <StatCard title="Sessions (24h)" value={stats?.studySessions24h} />
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Total Logins" value={stats?.totalLogins} />
        <StatCard title="Failed (24h)" value={stats?.failedLogins24h} color={stats?.failedLogins24h ? "text-red-600" : undefined} />
        <StatCard title="Suspicious (24h)" value={stats?.suspiciousActivity24h} color={stats?.suspiciousActivity24h ? "text-orange-500" : undefined} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
            User Growth (30 days)
          </h2>
          <div className="h-64">
            {signupsPerDay.length > 0 ? (
              <Line data={userGrowthData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No signup data available
              </div>
            )}
          </div>
        </div>

        {/* Study Activity Chart */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
            Study Activity (30 days)
          </h2>
          <div className="h-64">
            {sessionsPerDay.length > 0 ? (
              <Bar data={studyActivityData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No study session data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Breakdown + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Breakdown */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Subscription Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(tierCounts).map(([tier, count]) => {
              const total = stats?.totalUsers || 1;
              const pct = Math.round((count / total) * 100);
              const color = tier === "Lifetime Learner"
                ? "bg-purple-500"
                : tier === "Monthly Pro" || tier === "Annual Pro"
                  ? "bg-blue-500"
                  : "bg-gray-300";

              return (
                <div key={tier}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{tier}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/admin/users"
              className="block text-center px-4 py-3 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Manage Users
            </Link>
            <Link
              href="/admin/logs"
              className="block text-center px-4 py-3 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              View Logs
            </Link>
            <Link
              href="/admin/settings"
              className="block text-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              App Configuration
            </Link>
            <Link
              href="/pricing"
              className="block text-center px-4 py-3 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              View Pricing Page
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Signups */}
      {recentSignups.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Recent Signups (7 days)</h2>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {recentSignups.map((u) => (
              <div key={u._id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                    u.subscriptionTier === "Lifetime Learner"
                      ? "bg-purple-100 text-purple-800"
                      : u.subscriptionTier && u.subscriptionTier !== "Free"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-600"
                  }`}>
                    {u.subscriptionTier || "Free"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentSignups.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        u.subscriptionTier === "Lifetime Learner"
                          ? "bg-purple-100 text-purple-800"
                          : u.subscriptionTier && u.subscriptionTier !== "Free"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-600"
                      }`}>
                        {u.subscriptionTier || "Free"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({
  title,
  value,
  color,
}: {
  title: string;
  value?: number;
  color?: string;
}) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="px-3 py-4 sm:p-5">
      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</dt>
      <dd className={`mt-1 text-2xl sm:text-3xl font-semibold ${color || "text-gray-900"}`}>
        {value ?? 0}
      </dd>
    </div>
  </div>
);
