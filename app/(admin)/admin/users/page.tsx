/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/hooks/use-toast";

interface UserEntry {
  _id: string;
  name: string;
  email: string;
  role: string;
  subscriptionTier: string;
  createdAt: string;
  stripeCustomerId?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLES = ["Student", "Teacher", "Tutor", "Parent", "SchoolAdmin", "Admin"];
const TIERS = ["Free", "Monthly Pro", "Annual Pro", "Lifetime Learner"];

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (tierFilter) params.set("tier", tierFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(data.pagination);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, tierFilter]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "Admin") {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [session, status, router, fetchUsers]);

  const handleUpdate = async (
    userId: string,
    field: "role" | "subscriptionTier",
    value: string,
  ) => {
    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: data.error || "Failed to update user",
        });
        return;
      }
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, [field]: value } : u)),
      );
      const label = field === "subscriptionTier" ? "Subscription" : "Role";
      toast({ title: `${label} Updated`, description: `Set to ${value}` });
    } catch {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update user",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString();
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "Lifetime Learner":
        return "bg-purple-100 text-purple-800";
      case "Monthly Pro":
      case "Annual Pro":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (status === "loading") {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
          User Management
        </h1>
        <span className="text-sm text-gray-500">
          {pagination.total} total users
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          >
            <option value="">All Tiers</option>
            {TIERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">No users found.</div>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="sm:hidden space-y-3">
            {users.map((user) => (
              <div
                key={user._id}
                className={`bg-white rounded-lg shadow p-4 border border-gray-100 ${updating === user._id ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${getTierBadge(user.subscriptionTier || "Free")}`}>
                    {user.subscriptionTier || "Free"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Role</label>
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdate(user._id, "role", e.target.value)}
                      disabled={updating === user._id}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Tier</label>
                    <select
                      value={user.subscriptionTier || "Free"}
                      onChange={(e) => handleUpdate(user._id, "subscriptionTier", e.target.value)}
                      disabled={updating === user._id}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900"
                    >
                      {TIERS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Joined {formatDate(user.createdAt)}</p>
              </div>
            ))}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stripe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id} className={`hover:bg-gray-50 ${updating === user._id ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdate(user._id, "role", e.target.value)}
                          disabled={updating === user._id}
                          className="px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.subscriptionTier || "Free"}
                          onChange={(e) => handleUpdate(user._id, "subscriptionTier", e.target.value)}
                          disabled={updating === user._id}
                          className="px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
                        >
                          {TIERS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        {user.stripeCustomerId ? (
                          <span className="text-xs text-green-600 font-medium">Connected</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchUsers(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-4 w-4 mr-1" />
                  Prev
                </button>
                <button
                  onClick={() => fetchUsers(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
