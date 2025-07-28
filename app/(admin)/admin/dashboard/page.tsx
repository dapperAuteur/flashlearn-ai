/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(admin)/admin/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  
  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }
    
    if (session?.user && (session.user as any).role !== "admin") {
      router.push("/generate");
      return;
    }
    
    // Fetch dashboard stats
    const fetchStats = async () => {
      setLoading(true);
      
      try {
        // In a real implementation, this would be an API call
        // For demo purposes, we'll use dummy data
        setStats({
          totalUsers: 120,
          newUsers24h: 8,
          totalLogins: 450,
          failedLogins24h: 12,
          suspiciousActivity24h: 3
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [session, status, router]);
  
  if (loading) {
    return <div className="p-6">Loading dashboard data...</div>;
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Users
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.totalUsers}
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              New Users (24h)
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.newUsers24h}
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Logins
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats?.totalLogins}
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Failed Logins (24h)
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-text-red-600">
              {stats?.failedLogins24h}
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Suspicious Activity (24h)
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-orange-500">
              {stats?.suspiciousActivity24h}
            </dd>
          </div>
        </div>
      </div>
      
      {/* Quick actions */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/logs?type=failed_logins"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Failed Logins
          </Link>
          
          <Link
            href="/admin/logs?type=suspicious"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Suspicious Activity
          </Link>
          
          <Link
            href="/admin/users"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Manage Users
          </Link>
          
          <Link
            href="/admin/settings"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Security Settings
          </Link>
        </div>
      </div>
      
      {/* Recent activity summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Security Events</h2>
        
        <p className="text-sm text-gray-500 mb-4">
          This is a placeholder for a chart or timeline of recent security events.
          In a real implementation, this would display trending data about logins,
          failed attempts, and suspicious activities.
        </p>
        
        <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
          <span className="text-gray-400">Security events visualization would appear here</span>
        </div>
      </div>
    </div>
  );
}