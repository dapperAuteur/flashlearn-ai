"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminLogger, AdminLogContext } from "@/lib/logging/admin-logger";

interface DashboardStats {
  totalUsers: number;
  newUsers24h: number;
  totalLogins: number;
  failedLogins24h: number;
  suspiciousActivity24h: number;
  paidUsers: number;
  tierCounts: Record<string, number>;
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Total Users" value={stats?.totalUsers} />
        <StatCard title="New (24h)" value={stats?.newUsers24h} />
        <StatCard title="Paid Users" value={stats?.paidUsers} color="text-green-600" />
        <StatCard title="Logins" value={stats?.totalLogins} />
        <StatCard title="Failed (24h)" value={stats?.failedLogins24h} color={stats?.failedLogins24h ? "text-red-600" : undefined} />
        <StatCard title="Suspicious (24h)" value={stats?.suspiciousActivity24h} color={stats?.suspiciousActivity24h ? "text-orange-500" : undefined} />
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
