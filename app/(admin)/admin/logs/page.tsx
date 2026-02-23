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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ logType, page: page.toString(), limit: '25' });
      if (level) params.set('level', level);

      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch logs');
      }
      const data = await response.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      adminLogger.error(AdminLogContext.LOG_VIEWER, "Failed to load logs.", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [logType, level, page]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== 'Admin') {
      adminLogger.warn(AdminLogContext.LOG_VIEWER, "Unauthorized access attempt, redirecting.");
      router.push("/dashboard");
      return;
    }
    fetchLogs();
  }, [session, status, router, fetchLogs]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  const getLevelBadgeClass = (lvl: string) => {
    switch (lvl.toLowerCase()) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading') {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Application Logs</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={logType}
          onChange={(e) => { setLogType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
        >
          <option value="all">All Logs</option>
          <option value="system">System</option>
          <option value="auth">Auth</option>
        </select>
        <select
          value={level}
          onChange={(e) => { setLevel(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
        >
          <option value="">All Levels</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">No logs found.</div>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="sm:hidden space-y-3">
            {logs.map((log) => (
              <div key={log._id} className="bg-white rounded-lg shadow p-3 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getLevelBadgeClass(log.level)}`}>
                    {log.level}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(log.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-800 mb-1">{log.message}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium">{log.context}</span>
                  {log.userId && <span className="font-mono">{log.userId.slice(0, 8)}...</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Context</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(log.timestamp)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getLevelBadgeClass(log.level)}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-600">{log.context}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 max-w-md truncate">{log.message}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">{log.userId || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
