/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { adminLogger, AdminLogContext } from "@/lib/logging/admin-logger";

interface LogEntry {
  _id: string;
  timestamp: string;
  level: string;
  context: string;
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
  logSource: 'system_logs' | 'auth_logs';
}

export default function AdminLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logType, setLogType] = useState('all');
  const [level, setLevel] = useState('');
  const [context, setContext] = useState('');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    adminLogger.info(AdminLogContext.LOG_VIEWER, "Fetching logs started.", { page, logType, level, context, userId });
    try {
      const params = new URLSearchParams({
        logType,
        level,
        context,
        userId,
        page: page.toString(),
        limit: '25',
      });
      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch logs: ${response.statusText}`);
      }
      const data = await response.json();
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
      adminLogger.info(AdminLogContext.LOG_VIEWER, "Fetching logs successful.", { count: data.logs.length });
    } catch (err) {
      adminLogger.error(AdminLogContext.LOG_VIEWER, "Failed to load logs.", err);
      setError((err as Error).message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }, [logType, level, context, userId, page]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === "unauthenticated" || (session?.user as any)?.role !== 'Admin') {
      adminLogger.warn(AdminLogContext.LOG_VIEWER, "Unauthorized access attempt.", { status, role: (session?.user as any)?.role });
      router.push("/dashboard");
      return;
    }
    fetchLogs();
  }, [session, status, router, fetchLogs]);

  // FIX: Corrected the function definition.
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Application Logs</h1>
      
      {/* Filters UI would go here */}

      {loading ? (
        <div className="text-center py-10">Loading logs...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">{error}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Context</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(log.timestamp)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelBadgeClass(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">{log.context}</td>
                    <td className="px-6 py-4 text-sm text-gray-800">{log.message}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{log.userId || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Pagination controls would go here */}
    </div>
  );
}
