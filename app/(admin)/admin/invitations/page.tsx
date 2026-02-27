/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Send, Check, Clock, UserPlus } from "lucide-react";

interface InvitationEntry {
  _id: string;
  email: string;
  status: "sent" | "accepted" | "expired";
  personalNote?: string;
  sentAt: string;
  acceptedAt?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export default function AdminInvitationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [invitations, setInvitations] = useState<InvitationEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchInvitations = useCallback(
    async (page = 1) => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });
        if (statusFilter) params.set("status", statusFilter);

        const res = await fetch(`/api/admin/invitations?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch invitations");
        const data = await res.json();
        setInvitations(data.invitations || []);
        setPagination(data.pagination);
      } catch (err) {
        setErrorMessage((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    if (status === "authenticated" && user?.role === "Admin") {
      fetchInvitations();
    } else if (status === "authenticated") {
      router.push("/flashcards");
    }
  }, [status, user?.role, router, fetchInvitations]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          personalNote: personalNote.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to send invitation");
        return;
      }

      setSuccessMessage(`Invitation sent to ${email}`);
      setEmail("");
      setPersonalNote("");
      fetchInvitations(1);
    } catch {
      setErrorMessage("Failed to send invitation. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (d: string | undefined) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString();
  };

  const getStatusBadge = (invitationStatus: string) => {
    switch (invitationStatus) {
      case "accepted":
        return {
          className: "bg-green-100 text-green-800",
          icon: <Check className="h-3 w-3 mr-1" />,
          label: "Accepted",
        };
      case "sent":
        return {
          className: "bg-yellow-100 text-yellow-800",
          icon: <Clock className="h-3 w-3 mr-1" />,
          label: "Sent",
        };
      case "expired":
        return {
          className: "bg-gray-100 text-gray-600",
          icon: <Clock className="h-3 w-3 mr-1" />,
          label: "Expired",
        };
      default:
        return {
          className: "bg-gray-100 text-gray-600",
          icon: null,
          label: invitationStatus,
        };
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;

  if (status === "loading") {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Invitations
          </h1>
        </div>
        <span className="text-sm text-gray-500">
          {pagination.total} total invitations
        </span>
      </div>

      {/* Send Invitation Form */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          Send Invitation
        </h2>
        <form onSubmit={handleSendInvite} className="space-y-4">
          <div>
            <label
              htmlFor="invite-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="invite-note"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Personal Note{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="invite-note"
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="Add a personal message to include in the invitation email..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Invite
              </>
            )}
          </button>
        </form>
      </div>

      {/* Success / Error Messages */}
      {successMessage && (
        <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-4 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Invitation History */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 border-b border-gray-200 gap-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Invitation History
          </h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          >
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
            <p className="mt-3 text-gray-500 text-sm">
              Loading invitations...
            </p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            No invitations found.
          </div>
        ) : (
          <>
            {/* Mobile: card layout */}
            <div className="sm:hidden divide-y divide-gray-100">
              {invitations.map((inv) => {
                const badge = getStatusBadge(inv.status);
                return (
                  <div key={inv._id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {inv.email}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${badge.className}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-gray-500">Sent</p>
                        <p className="text-xs text-gray-700">
                          {formatDate(inv.sentAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Accepted</p>
                        <p className="text-xs text-gray-700">
                          {formatDate(inv.acceptedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sent Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Accepted Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invitations.map((inv) => {
                    const badge = getStatusBadge(inv.status);
                    return (
                      <tr key={inv._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900">{inv.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${badge.className}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(inv.sentAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(inv.acceptedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchInvitations(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchInvitations(pagination.page + 1)}
                    disabled={pagination.page >= totalPages}
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
    </div>
  );
}
