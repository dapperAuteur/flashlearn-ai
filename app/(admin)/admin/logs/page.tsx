/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(admin)/admin/logs/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AuthLog, AuthEventType } from "@/models/AuthLog";

export default function AuthLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logType, setLogType] = useState<string>("all");
  const [userId, setUserId] = useState<string>("");
  
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url = `/api/admin/logs?type=${logType}`;
      if (userId) {
        url += `&userId=${userId}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }
      
      const data = await response.json();
      setLogs(data.logs);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to load authentication logs");
    } finally {
      setLoading(false);
    }
  }, [logType, userId]);
  
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
    
    // Load logs when component mounts or filters change
    fetchLogs();
  }, [session, status, router, fetchLogs]);
  
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const getStatusBadgeClass = (status: string) => {
    return status === "success" 
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };
  
  const getEventLabel = (event: string) => {
    return event.replace(/_/g, " ");
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Authentication Logs</h1>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-md shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="logType" className="block text-sm font-medium text-gray-700">
              Log Type
            </label>
            <select
              id="logType"
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Logs</option>
              <option value="failed_logins">Failed Logins</option>
              <option value="suspicious">Suspicious Activity</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
              User ID (optional)
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
      
      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-4">Loading logs...</div>
      ) : error ? (
        <div className="text-center py-4 text-red-600">{error}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-4">No logs found matching the criteria</div>
      ) : (
        <div className="bg-white rounded-md shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log._id?.toString()}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.timestamp.toString())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getEventLabel(log.event)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.email || log.userId || "Anonymous"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.reason || "N/A"}
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