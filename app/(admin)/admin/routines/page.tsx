"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { SCHEDULED_ROUTINES, ROUTINES_DASHBOARD_URL } from "@/lib/routines/scheduled";

interface RoutineRun {
  _id: string;
  routineSlug: string;
  routineName: string;
  triggerId?: string;
  runAt: string;
  status: "success" | "error" | "needs_input";
  alertLevel: "info" | "warning" | "alert";
  summary: string;
  details?: string;
  link?: string;
  createdAt: string;
}

const ALERT_STYLES: Record<RoutineRun["alertLevel"], { bg: string; text: string; icon: React.ElementType; label: string }> = {
  alert: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: ExclamationCircleIcon, label: "Alert" },
  warning: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: ExclamationTriangleIcon, label: "Warning" },
  info: { bg: "bg-gray-50 border-gray-200", text: "text-gray-700", icon: CheckCircleIcon, label: "Info" },
};

const STATUS_STYLES: Record<RoutineRun["status"], { bg: string; text: string; label: string }> = {
  success: { bg: "bg-green-100", text: "text-green-800", label: "Success" },
  error: { bg: "bg-red-100", text: "text-red-800", label: "Error" },
  needs_input: { bg: "bg-blue-100", text: "text-blue-800", label: "Needs input" },
};

function relativeTime(iso: string, now: number = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminRoutinesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [runs, setRuns] = useState<RoutineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/routines/runs?limit=100");
      if (!res.ok) throw new Error("Failed to fetch routine runs");
      const data = await res.json();
      setRuns(data.runs || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "Admin") {
      router.push("/dashboard");
      return;
    }
    fetchRuns();
  }, [session, status, router, fetchRuns]);

  if (status === "loading" || loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-3 text-gray-500 text-sm">Loading routines...</p>
      </div>
    );
  }

  // Group runs by slug for the per-routine recent-runs view.
  const runsBySlug = new Map<string, RoutineRun[]>();
  for (const r of runs) {
    if (!runsBySlug.has(r.routineSlug)) runsBySlug.set(r.routineSlug, []);
    runsBySlug.get(r.routineSlug)!.push(r);
  }

  const recentAlerts = runs.filter((r) => r.alertLevel === "alert").slice(0, 5);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">Scheduled Routines</h1>
          <p className="text-sm text-gray-600 max-w-3xl">
            Background agents running on cron. Full run transcripts + edit + run-now controls live on the canonical{" "}
            <a
              href={ROUTINES_DASHBOARD_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
            >
              Claude routines page <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </a>
            . This page mirrors run summaries written by the agents themselves so you can scan recent activity without context-switching.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchRuns}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          aria-label="Refresh routine runs"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Recent alerts surface */}
      {recentAlerts.length > 0 && (
        <section className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-red-800 mb-3 inline-flex items-center gap-2">
            <ExclamationCircleIcon className="h-5 w-5" />
            Recent alerts ({recentAlerts.length})
          </h2>
          <ul className="space-y-3">
            {recentAlerts.map((r) => (
              <li key={r._id} className="bg-white rounded-lg p-3 border border-red-100">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">{r.routineName}</span>
                  <span className="text-xs text-gray-500">{relativeTime(r.runAt)}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{r.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Scheduled routines list */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">All routines</h2>
        <ul className="space-y-3">
          {SCHEDULED_ROUTINES.map((routine) => {
            const recent = runsBySlug.get(routine.slug) || [];
            const lastRun = recent[0];
            const expanded = expandedSlug === routine.slug;
            return (
              <li key={routine.slug} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{routine.name}</h3>
                        <span className="text-xs font-mono text-gray-500">{routine.slug}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {routine.schedule}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">{routine.reason}</p>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <a
                        href={routine.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1"
                      >
                        Open routine
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                      </a>
                      {recent.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedSlug(expanded ? null : routine.slug)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                          aria-expanded={expanded}
                        >
                          {expanded ? "Hide history" : `Show ${recent.length} run${recent.length === 1 ? "" : "s"}`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Last run summary */}
                  {lastRun && (
                    <div className={`mt-3 border rounded-lg p-3 text-sm ${ALERT_STYLES[lastRun.alertLevel].bg}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const Icon = ALERT_STYLES[lastRun.alertLevel].icon;
                            return <Icon className={`h-4 w-4 ${ALERT_STYLES[lastRun.alertLevel].text}`} />;
                          })()}
                          <span className={`text-xs font-medium ${ALERT_STYLES[lastRun.alertLevel].text}`}>
                            Last run: {relativeTime(lastRun.runAt)}
                          </span>
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${STATUS_STYLES[lastRun.status].bg} ${STATUS_STYLES[lastRun.status].text}`}
                          >
                            {STATUS_STYLES[lastRun.status].label}
                          </span>
                        </div>
                        {lastRun.link && (
                          <a
                            href={lastRun.link}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                          >
                            Transcript
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="mt-2 text-gray-800 whitespace-pre-line">{lastRun.summary}</p>
                    </div>
                  )}

                  {!lastRun && (
                    <p className="mt-3 text-xs text-gray-500 italic">
                      No runs recorded yet. The agent writes a summary here at the end of every run.
                    </p>
                  )}

                  {/* Expanded history */}
                  {expanded && recent.length > 1 && (
                    <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      {recent.slice(1).map((r) => (
                        <li key={r._id} className="text-xs">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-gray-600">{relativeTime(r.runAt)}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded ${STATUS_STYLES[r.status].bg} ${STATUS_STYLES[r.status].text}`}
                            >
                              {STATUS_STYLES[r.status].label}
                            </span>
                          </div>
                          <p className="mt-1 text-gray-700 whitespace-pre-line">{r.summary}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
