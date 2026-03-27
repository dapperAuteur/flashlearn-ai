"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Payment {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  cashAppName: string;
  status: "pending" | "verified" | "rejected";
  adminNotes?: string;
  verifiedAt?: string;
  createdAt: string;
}

interface ConfirmAction {
  id: string;
  action: "verify" | "reject";
  userName: string;
}

export default function AdminCashAppPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/cashapp");
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setPendingCount(data.pendingCount || 0);
      }
    } catch { /* non-critical */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "Admin") {
      router.push("/dashboard");
      return;
    }
    fetchPayments();
  }, [session, status, router, fetchPayments]);

  const handleAction = async () => {
    if (!confirmAction) return;
    setProcessing(confirmAction.id);
    try {
      const res = await fetch("/api/admin/cashapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: confirmAction.id,
          action: confirmAction.action,
          adminNotes: adminNotes || undefined,
        }),
      });
      if (res.ok) {
        await fetchPayments();
      }
    } catch { /* non-critical */ } finally {
      setProcessing(null);
      setConfirmAction(null);
      setAdminNotes("");
    }
  };

  const pending = payments.filter((p) => p.status === "pending");
  const processed = payments.filter((p) => p.status !== "pending");

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {confirmAction.action === "verify" ? "Approve Payment" : "Reject Payment"}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {confirmAction.action === "verify"
                ? `Approve $100 CashApp payment from ${confirmAction.userName}? This will upgrade them to Lifetime Learner.`
                : `Reject payment from ${confirmAction.userName}?`}
            </p>
            <label htmlFor="admin-notes" className="block text-xs font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 mb-4 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setConfirmAction(null); setAdminNotes(""); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={!!processing}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  confirmAction.action === "verify" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                } disabled:opacity-50`}
              >
                {processing ? "Processing..." : confirmAction.action === "verify" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" aria-hidden="true" />
            CashApp Payments
          </h1>
          <p className="text-sm text-gray-500 mt-1">Verify lifetime membership payments from Cash App</p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Verification Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How to verify</p>
        <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
          <li>Open <strong>Cash App for Business</strong> (app or web dashboard)</li>
          <li>Check recent received payments for <strong>$100</strong></li>
          <li>Match by <strong>CashApp display name</strong> and date/time below</li>
          <li>If the payment is confirmed in CashApp, click <strong>Approve</strong></li>
        </ol>
      </div>

      {/* Pending Queue */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Pending Verification</h2>
        {pending.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" aria-hidden="true" />
            <p className="text-sm text-green-800">No pending payments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <div key={p._id} className="bg-white border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{p.userName}</p>
                  <p className="text-xs text-gray-500">{p.userEmail}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    CashApp: <strong>{p.cashAppName}</strong> &middot; ${p.amount} &middot; {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setConfirmAction({ id: p._id, action: "verify", userName: p.userName })}
                    disabled={!!processing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                    aria-label={`Approve payment from ${p.userName}`}
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    Approve
                  </button>
                  <button
                    onClick={() => setConfirmAction({ id: p._id, action: "reject", userName: p.userName })}
                    disabled={!!processing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                    aria-label={`Reject payment from ${p.userName}`}
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed History */}
      {processed.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">History</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500">User</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500">CashApp</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">Notes</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {processed.map((p) => (
                    <tr key={p._id}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900">{p.userName}</p>
                        <p className="text-xs text-gray-500">{p.userEmail}</p>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{p.cashAppName}</td>
                      <td className="px-4 py-2">
                        {p.status === "verified" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <CheckCircle className="h-3 w-3" aria-hidden="true" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                            <AlertCircle className="h-3 w-3" aria-hidden="true" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 hidden sm:table-cell">{p.adminNotes || "—"}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{new Date(p.verifiedAt || p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
