"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/hooks/use-toast";
import { isManagedEmail } from "@/lib/teacher/managedEmailDomain";

interface UserEntry {
  _id: string;
  name: string;
  email: string;
  role: string;
  subscriptionTier: string;
  createdAt: string;
  stripeCustomerId?: string;
  emailVerified?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ConfirmAction {
  type: 'role' | 'tier' | 'delete' | 'unlink';
  userId: string;
  userName: string;
  value?: string;
  oldValue?: string;
  /** Set for 'unlink' only: the student losing the link. */
  studentId?: string;
}

/** A learner reachable through User.linkedStudentIds on the account above. */
interface LinkedStudent {
  id: string;
  name: string;
  email: string | null;
  isManaged: boolean;
  pendingDeletion: boolean;
}

interface LinkedStudents {
  guardian: { id: string; name: string; role: string; canProctor: boolean };
  students: LinkedStudent[];
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
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // Linked students, one open panel at a time. Keeping a single panel's worth
  // of state rather than a map per user means the search box and its results
  // cannot belong to a row the admin has since closed.
  const [linkedPanelUserId, setLinkedPanelUserId] = useState<string | null>(null);
  const [linked, setLinked] = useState<LinkedStudents | null>(null);
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [linkedMessage, setLinkedMessage] = useState("");
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState<UserEntry[] | null>(null);
  const [linkSearching, setLinkSearching] = useState(false);
  const [linkBusyId, setLinkBusyId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
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
    field: "role" | "subscriptionTier" | "emailVerified",
    value: string | boolean,
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
        toast({ variant: "destructive", title: "Update Failed", description: data.error || "Failed to update user" });
        return;
      }
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, [field]: value } : u)));
      const label = field === "subscriptionTier" ? "Subscription" : field === "emailVerified" ? "Email Verification" : "Role";
      toast({ title: `${label} Updated`, description: field === "emailVerified" ? (value ? "Verified" : "Unverified") : `Set to ${value}` });
    } catch {
      toast({ variant: "destructive", title: "Update Failed", description: "Failed to update user" });
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (userId: string) => {
    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast({ variant: "destructive", title: "Delete Failed", description: data.error || "Failed to delete user" });
        return;
      }
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast({ title: "User Deleted", description: "User and their data have been removed." });
    } catch {
      toast({ variant: "destructive", title: "Delete Failed", description: "Failed to delete user" });
    } finally {
      setUpdating(null);
    }
  };

  const loadLinkedStudents = useCallback(async (userId: string) => {
    setLinkedLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/linked-students`);
      const data = await res.json();
      if (!res.ok) {
        setLinked(null);
        setLinkedMessage(data.error || "Could not load linked students.");
        return;
      }
      setLinked(data);
      setLinkedMessage(
        data.students.length === 0
          ? "No students are linked to this account."
          : `${data.students.length} student${data.students.length === 1 ? "" : "s"} linked.`,
      );
    } catch {
      setLinked(null);
      setLinkedMessage("Could not load linked students.");
    } finally {
      setLinkedLoading(false);
    }
  }, []);

  const toggleLinkedPanel = (user: UserEntry) => {
    if (linkedPanelUserId === user._id) {
      setLinkedPanelUserId(null);
      return;
    }
    setLinkedPanelUserId(user._id);
    setLinked(null);
    setLinkResults(null);
    setLinkSearch("");
    setLinkedMessage("");
    loadLinkedStudents(user._id);
  };

  // The account picker reuses the list endpoint this page already reads, so an
  // admin searching for a student gets the same matches, filters, and paging
  // rules as the table above rather than a second search that answers
  // differently.
  const searchStudentsToLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = linkSearch.trim();
    if (!linkedPanelUserId || !term) return;

    setLinkSearching(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "10", search: term });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      // Nobody is their own guardian, so the account being edited is never a
      // result. The route refuses it too; this keeps the button from appearing.
      const matches: UserEntry[] = (data.users || []).filter(
        (candidate: UserEntry) => candidate._id !== linkedPanelUserId,
      );
      setLinkResults(matches);
      setLinkedMessage(
        matches.length === 0
          ? "No accounts matched that search."
          : `${matches.length} account${matches.length === 1 ? "" : "s"} found.`,
      );
    } catch {
      setLinkResults([]);
      setLinkedMessage("Search failed. Try again.");
    } finally {
      setLinkSearching(false);
    }
  };

  const handleLink = async (studentId: string, studentName: string) => {
    if (!linkedPanelUserId) return;
    setLinkBusyId(studentId);
    try {
      const res = await fetch(`/api/admin/users/${linkedPanelUserId}/linked-students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkedMessage(data.error || "Could not link that student.");
        toast({ variant: "destructive", title: "Link Failed", description: data.error || "Could not link that student." });
        return;
      }
      setLinked(data);
      setLinkedMessage(`${studentName} is now linked to this account.`);
      toast({ title: "Student Linked", description: `${studentName} can now be proctored by this account.` });
    } catch {
      setLinkedMessage("Could not link that student.");
      toast({ variant: "destructive", title: "Link Failed", description: "Could not link that student." });
    } finally {
      setLinkBusyId(null);
    }
  };

  const handleUnlink = async (studentId: string, studentName: string) => {
    if (!linkedPanelUserId) return;
    setLinkBusyId(studentId);
    try {
      const res = await fetch(`/api/admin/users/${linkedPanelUserId}/linked-students`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkedMessage(data.error || "Could not unlink that student.");
        toast({ variant: "destructive", title: "Unlink Failed", description: data.error || "Could not unlink that student." });
        return;
      }
      setLinked(data);
      setLinkedMessage(`${studentName} is no longer linked to this account.`);
      toast({ title: "Student Unlinked", description: `This account can no longer proctor ${studentName}.` });
    } catch {
      setLinkedMessage("Could not unlink that student.");
      toast({ variant: "destructive", title: "Unlink Failed", description: "Could not unlink that student." });
    } finally {
      setLinkBusyId(null);
    }
  };

  const requestConfirmation = (action: ConfirmAction) => {
    setConfirmAction(action);
  };

  const executeConfirmedAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete') {
      handleDelete(confirmAction.userId);
    } else if (confirmAction.type === 'role') {
      handleUpdate(confirmAction.userId, 'role', confirmAction.value!);
    } else if (confirmAction.type === 'tier') {
      handleUpdate(confirmAction.userId, 'subscriptionTier', confirmAction.value!);
    } else if (confirmAction.type === 'unlink' && confirmAction.studentId) {
      handleUnlink(confirmAction.studentId, confirmAction.value || 'That student');
    }
    setConfirmAction(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString();
  };

  // A teacher-managed account's address is synthetic and can never receive
  // mail, so showing it invites an admin to write to an address that does not
  // exist. The name is the only useful identifier those accounts have.
  const displayEmail = (email?: string | null) =>
    email && !isManagedEmail(email) ? email : "Managed account, no email address";

  const isPaying = (user: UserEntry) => !!user.stripeCustomerId;

  const getTierBadge = (user: UserEntry) => {
    const tier = user.subscriptionTier || "Free";
    const paying = isPaying(user);

    if (tier === "Free") return "bg-gray-100 text-gray-600";
    if (!paying) return "bg-amber-100 text-amber-800"; // Non-paying but has tier = manual/test
    if (tier === "Lifetime Learner") return "bg-purple-100 text-purple-800";
    return "bg-blue-100 text-blue-800";
  };

  const getTierLabel = (user: UserEntry) => {
    const tier = user.subscriptionTier || "Free";
    if (tier !== "Free" && !isPaying(user)) return `${tier} (manual)`;
    return tier;
  };

  /**
   * The linked-students panel, rendered inline under the row it belongs to.
   *
   * Inline rather than a second modal: the confirm dialog this page already
   * uses would have to open on top of it to confirm an unlink, and stacked
   * dialogs are a trap for keyboard and screen reader users. `layout` keeps the
   * ids unique, because the card list and the table are both in the DOM and CSS
   * decides which one is shown.
   */
  const renderLinkedPanel = (user: UserEntry, layout: string) => {
    const searchId = `link-search-${layout}-${user._id}`;

    return (
      <div
        id={`linked-panel-${layout}-${user._id}`}
        className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left"
      >
        <h3 className="text-sm font-semibold text-gray-900">
          Students linked to {user.name}
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          A linked account can run study sessions for that student and read their progress.
          Only an admin can create or remove a link.
        </p>

        {linked && !linked.guardian.canProctor && (
          <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
            This account&apos;s role is {linked.guardian.role}, which cannot study on anyone
            else&apos;s behalf. New links are refused, and any link listed below does nothing
            until the role changes.
          </p>
        )}

        <p role="status" aria-live="polite" className="mt-3 text-xs text-gray-700 min-h-[1rem]">
          {linkedLoading ? "Loading linked students..." : linkedMessage}
        </p>

        {linked && linked.students.length > 0 && (
          <ul className="mt-2 space-y-2">
            {linked.students.map((student) => (
              <li
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-2 bg-white border border-gray-200 rounded p-2"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900">{student.name}</span>
                  <span className="block text-xs text-gray-600">
                    {student.isManaged ? "Managed account, no email address" : student.email || "No email on file"}
                    {student.pendingDeletion ? " (scheduled for deletion)" : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    requestConfirmation({
                      type: 'unlink',
                      userId: user._id,
                      userName: user.name,
                      value: student.name,
                      studentId: student.id,
                    })
                  }
                  disabled={linkBusyId === student.id}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {linkBusyId === student.id ? "Working..." : "Unlink"}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={searchStudentsToLink} className="mt-4 flex flex-col sm:flex-row sm:items-end gap-2">
          <div className="flex-1">
            <label htmlFor={searchId} className="block text-xs font-medium text-gray-700 mb-1">
              Find a student to link
            </label>
            <input
              id={searchId}
              type="search"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Name or email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={linkSearching || !linkSearch.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {linkSearching ? "Searching..." : "Search"}
          </button>
        </form>

        {linkResults && linkResults.length > 0 && (
          <ul className="mt-3 space-y-2">
            {linkResults.map((candidate) => {
              const alreadyLinked = linked?.students.some((s) => s.id === candidate._id) ?? false;
              return (
                <li
                  key={candidate._id}
                  className="flex flex-wrap items-center justify-between gap-2 bg-white border border-gray-200 rounded p-2"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{candidate.name}</span>
                    <span className="block text-xs text-gray-600">
                      {displayEmail(candidate.email)} ({candidate.role})
                    </span>
                  </span>
                  {alreadyLinked ? (
                    <span className="text-xs text-gray-600">Already linked</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLink(candidate._id, candidate.name)}
                      disabled={linkBusyId === candidate._id}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {linkBusyId === candidate._id ? "Linking..." : "Link"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  if (status === "loading") {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${confirmAction.type === 'delete' ? 'bg-red-100' : 'bg-amber-100'}`}>
                <ExclamationTriangleIcon className={`h-5 w-5 ${confirmAction.type === 'delete' ? 'text-red-600' : 'text-amber-600'}`} />
              </div>
              <h2 id="confirm-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {confirmAction.type === 'delete'
                  ? 'Delete User'
                  : confirmAction.type === 'unlink'
                    ? 'Unlink Student'
                    : 'Confirm Change'}
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              <strong>{confirmAction.userName}</strong>
            </p>
            {confirmAction.type === 'delete' ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This will permanently delete this user and their profile. This action cannot be undone.
              </p>
            ) : confirmAction.type === 'unlink' ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Unlink <strong>{confirmAction.value}</strong>? This account will stop being able to
                run study sessions for them or read their progress. Nothing already recorded is
                deleted, and the link can be made again.
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Change {confirmAction.type} from <strong>{confirmAction.oldValue}</strong> to <strong>{confirmAction.value}</strong>?
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmAction.type === 'delete'
                  ? 'Delete'
                  : confirmAction.type === 'unlink'
                    ? 'Unlink'
                    : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">User Management</h1>
        <span className="text-sm text-gray-500">{pagination.total} total users</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900">
            <option value="">All Roles</option>
            {ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
          <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900">
            <option value="">All Tiers</option>
            {TIERS.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
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
              <div key={user._id} className={`bg-white rounded-lg shadow p-4 border border-gray-100 ${updating === user._id ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{displayEmail(user.email)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${getTierBadge(user)}`}>
                    {getTierLabel(user)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Role</label>
                    <select
                      value={user.role}
                      onChange={(e) => requestConfirmation({ type: 'role', userId: user._id, userName: user.name, value: e.target.value, oldValue: user.role })}
                      disabled={updating === user._id}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900"
                    >
                      {ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Tier</label>
                    <select
                      value={user.subscriptionTier || "Free"}
                      onChange={(e) => requestConfirmation({ type: 'tier', userId: user._id, userName: user.name, value: e.target.value, oldValue: user.subscriptionTier || "Free" })}
                      disabled={updating === user._id}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-900"
                    >
                      {TIERS.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-600">Joined {formatDate(user.createdAt)}</p>
                    {isPaying(user) ? (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">Stripe</span>
                    ) : user.subscriptionTier !== "Free" ? (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">Manual</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {user.emailVerified ? (
                      <span className="text-xs text-green-600 font-medium">Verified</span>
                    ) : (
                      <button onClick={() => handleUpdate(user._id, "emailVerified", true)} disabled={updating === user._id} className="text-xs text-amber-600 hover:text-amber-700 font-medium underline">
                        Verify
                      </button>
                    )}
                    <button
                      onClick={() => requestConfirmation({ type: 'delete', userId: user._id, userName: `${user.name} (${displayEmail(user.email)})` })}
                      disabled={updating === user._id}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      aria-label={`Delete ${user.name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => toggleLinkedPanel(user)}
                    aria-expanded={linkedPanelUserId === user._id}
                    aria-controls={`linked-panel-card-${user._id}`}
                    className="w-full px-3 py-2 text-xs font-medium text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {linkedPanelUserId === user._id ? "Hide linked students" : "Linked students"}
                  </button>
                </div>
                {linkedPanelUserId === user._id && (
                  <div className="mt-3">{renderLinkedPanel(user, "card")}</div>
                )}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <Fragment key={user._id}>
                    <tr className={`hover:bg-gray-50 ${updating === user._id ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{displayEmail(user.email)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => requestConfirmation({ type: 'role', userId: user._id, userName: user.name, value: e.target.value, oldValue: user.role })}
                          disabled={updating === user._id}
                          className="px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
                        >
                          {ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.subscriptionTier || "Free"}
                          onChange={(e) => requestConfirmation({ type: 'tier', userId: user._id, userName: user.name, value: e.target.value, oldValue: user.subscriptionTier || "Free" })}
                          disabled={updating === user._id}
                          className="px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
                        >
                          {TIERS.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {isPaying(user) ? (
                          <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Stripe</span>
                        ) : user.subscriptionTier !== "Free" ? (
                          <span className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Manual</span>
                        ) : (
                          <span className="text-xs text-gray-400">Free</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.emailVerified ? (
                          <span className="text-xs text-green-600 font-medium">Yes</span>
                        ) : (
                          <button onClick={() => handleUpdate(user._id, "emailVerified", true)} disabled={updating === user._id} className="text-xs text-amber-600 hover:text-amber-700 font-medium underline">
                            Verify
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleLinkedPanel(user)}
                            aria-expanded={linkedPanelUserId === user._id}
                            aria-controls={`linked-panel-row-${user._id}`}
                            className="px-2.5 py-1.5 text-xs font-medium text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                          >
                            {linkedPanelUserId === user._id ? "Hide linked" : "Linked students"}
                          </button>
                          <button
                            onClick={() => requestConfirmation({ type: 'delete', userId: user._id, userName: `${user.name} (${displayEmail(user.email)})` })}
                            disabled={updating === user._id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label={`Delete ${user.name}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {linkedPanelUserId === user._id && (
                      <tr>
                        <td colSpan={7} className="px-4 pb-4">
                          {renderLinkedPanel(user, "row")}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => fetchUsers(pagination.page - 1)} disabled={pagination.page <= 1} className="inline-flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronLeftIcon className="h-4 w-4 mr-1" /> Prev
                </button>
                <button onClick={() => fetchUsers(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="inline-flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  Next <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
