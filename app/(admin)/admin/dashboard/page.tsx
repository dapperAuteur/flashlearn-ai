/* eslint-disable @typescript-eslint/no-explicit-any */
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
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === "unauthenticated" || (session?.user as any)?.role !== "Admin") {
      adminLogger.warn(AdminLogContext.DASHBOARD, "Unauthorized access attempt to dashboard.", { status, role: (session?.user as any)?.role });
      router.push("/dashboard"); // Redirect non-admins
      return;
    }
    
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      adminLogger.info(AdminLogContext.DASHBOARD, "Fetching dashboard stats.");
      
      try {
        const response = await fetch('/api/admin/analytics');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch dashboard stats');
        }
        const data = await response.json();
        setStats(data.stats);
        adminLogger.info(AdminLogContext.DASHBOARD, "Successfully fetched stats.", { stats: data.stats });
      } catch (err) {
        adminLogger.error(AdminLogContext.DASHBOARD, "Error fetching dashboard stats", err);
        setError((err as Error).message || "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [session, status, router]);
  
  if (loading) {
    return <div className="p-6 text-center">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600 bg-red-50 rounded-md">{error}</div>;
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
        {/* Stat Cards */}
        <StatCard title="Total Users" value={stats?.totalUsers} />
        <StatCard title="New Users (24h)" value={stats?.newUsers24h} />
        <StatCard title="Total Successful Logins" value={stats?.totalLogins} />
        <StatCard title="Failed Logins (24h)" value={stats?.failedLogins24h} isError />
        <StatCard title="Suspicious Activity (24h)" value={stats?.suspiciousActivity24h} isWarning />
      </div>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/logs" className="block text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
            View All Logs
          </Link>
          <Link href="/admin/users" className="block text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
            Manage Users
          </Link>
          <Link href="/admin/settings" className="block text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
            App Configuration
          </Link>
        </div>
      </div>

      {/* Placeholder for charts */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Usage Analytics</h2>
        <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
          <span className="text-gray-400">Charts and visualizations will appear here.</span>
        </div>
      </div>
    </div>
  );
}

// Helper component for stat cards
const StatCard = ({ title, value, isError = false, isWarning = false }: { title: string, value?: number, isError?: boolean, isWarning?: boolean }) => {
  let valueClass = "text-gray-900";
  if (isError && (value ?? 0) > 0) valueClass = "text-red-600";
  if (isWarning && (value ?? 0) > 0) valueClass = "text-orange-500";

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
        <dd className={`mt-1 text-3xl font-semibold ${valueClass}`}>
          {value ?? 0}
        </dd>
      </div>
    </div>
  );
};
