"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Swords,
  BookOpen,
  BarChart3,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface ShortLink {
  type: "versus" | "set" | "results";
  label: string;
  subtitle: string | null;
  shortUrl: string;
  shortId: string;
  createdAt: string;
}

interface LinkData {
  links: ShortLink[];
  totals: { challenges: number; sets: number; sessions: number };
  missing: { challenges: number; sets: number; sessions: number };
}

const typeConfig = {
  versus: { icon: Swords, color: "text-orange-600", bg: "bg-orange-50", label: "Versus" },
  set: { icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50", label: "Set" },
  results: { icon: BarChart3, color: "text-green-600", bg: "bg-green-50", label: "Results" },
} as const;

export default function AdminLinksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "versus" | "set" | "results">("all");

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/links");
      if (!res.ok) throw new Error("Failed to fetch links");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
    fetchLinks();
  }, [session, status, router, fetchLinks]);

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/admin/links/backfill", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Backfill failed");
      setBackfillResult(
        `Processed ${json.processed} items: ${json.succeeded} succeeded, ${json.failed} failed`
      );
      await fetchLinks();
    } catch (err) {
      setBackfillResult(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setBackfilling(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading link data">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
        <span className="sr-only">Loading link data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" role="alert">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" aria-hidden="true" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalLinks = data.totals.challenges + data.totals.sets + data.totals.sessions;
  const totalMissing = data.missing.challenges + data.missing.sets + data.missing.sessions;
  const filteredLinks = filterType === "all"
    ? data.links
    : data.links.filter((l) => l.type === filterType);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="h-6 w-6 text-blue-600" aria-hidden="true" />
            Short Links
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Switchy.io tracked short links across all shared content
          </p>
        </div>
        <button
          onClick={() => fetchLinks()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          aria-label="Refresh link data"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" role="group" aria-label="Link statistics">
        <SummaryCard
          label="Total Links"
          value={totalLinks}
          icon={Link2}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <SummaryCard
          label="Versus"
          value={data.totals.challenges}
          icon={Swords}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <SummaryCard
          label="Sets"
          value={data.totals.sets}
          icon={BookOpen}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <SummaryCard
          label="Results"
          value={data.totals.sessions}
          icon={BarChart3}
          color="text-green-600"
          bg="bg-green-50"
        />
      </div>

      {/* Missing Links + Backfill */}
      {totalMissing > 0 && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-lg p-4"
          role="status"
          aria-label="Content missing short links"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-medium text-amber-800">
                {totalMissing} shareable item{totalMissing !== 1 ? "s" : ""} without short links
              </p>
              <p className="text-sm text-amber-600 mt-1">
                {data.missing.challenges > 0 && `${data.missing.challenges} challenges`}
                {data.missing.challenges > 0 && data.missing.sets > 0 && ", "}
                {data.missing.sets > 0 && `${data.missing.sets} public sets`}
                {(data.missing.challenges > 0 || data.missing.sets > 0) &&
                  data.missing.sessions > 0 &&
                  ", "}
                {data.missing.sessions > 0 && `${data.missing.sessions} shared sessions`}
              </p>
            </div>
            <button
              onClick={handleBackfill}
              disabled={backfilling}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={backfilling ? "Backfill in progress" : "Generate short links for all missing content"}
            >
              {backfilling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Backfilling...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Backfill All
                </>
              )}
            </button>
          </div>
          {backfillResult && (
            <p
              className={`mt-3 text-sm ${backfillResult.startsWith("Error") ? "text-red-700" : "text-green-700"}`}
              role="status"
            >
              {backfillResult}
            </p>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Filter links by type">
        {(["all", "versus", "set", "results"] as const).map((type) => (
          <button
            key={type}
            role="tab"
            aria-selected={filterType === type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filterType === type
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {type === "all"
              ? `All (${data.links.length})`
              : `${type.charAt(0).toUpperCase() + type.slice(1)} (${data.links.filter((l) => l.type === type).length})`}
          </button>
        ))}
      </div>

      {/* Links Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Content</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Short URL</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Created</th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-gray-600">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No short links found
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link, i) => {
                  const config = typeConfig[link.type];
                  const Icon = config.icon;
                  return (
                    <tr key={`${link.shortId}-${i}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.bg} ${config.color}`}>
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-[300px]">
                          {link.label}
                        </p>
                        {link.subtitle && (
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {link.subtitle}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 break-all">
                          {link.shortUrl}
                        </code>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs whitespace-nowrap">
                        {new Date(link.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={link.shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                          aria-label={`Open short link for ${link.label}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">Open</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4" role="group" aria-label={`${label}: ${value}`}>
      <div className="flex items-center gap-3">
        <div className={`${bg} p-2 rounded-lg`}>
          <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
