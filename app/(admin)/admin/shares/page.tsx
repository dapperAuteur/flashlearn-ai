"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Share2, UserPlus, TrendingUp, Zap } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

interface ShareSummary {
  totalClicks: number;
  totalConversions: number;
  overallConversionRate: number;
  topPlatform: string;
}

interface ByType {
  versus: number;
  results: number;
  set: number;
}

interface UtmRow {
  source: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

interface ChallengeRow {
  code: string;
  clicks: number;
  conversions: number;
}

interface TimelinePoint {
  date: string;
  clicks: number;
  conversions: number;
}

interface SharesData {
  summary: ShareSummary;
  clicksByType: ByType;
  conversionsByType: ByType;
  utmBreakdown: UtmRow[];
  topChallenges: ChallengeRow[];
  timelineData: TimelinePoint[];
}

export default function AdminSharesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<SharesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "Admin") {
      router.push("/dashboard");
      return;
    }

    fetch("/api/admin/analytics/shares")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch share analytics");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session, status, router]);

  if (loading || status === "loading") {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-3 text-gray-500 text-sm">Loading share analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 rounded-md">
        {error}
      </div>
    );
  }

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const timeline = data?.timelineData ?? [];
  const chartData = {
    labels: timeline.map((d) => formatDateLabel(d.date)),
    datasets: [
      {
        label: "Clicks",
        data: timeline.map((d) => d.clicks),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: "Signups",
        data: timeline.map((d) => d.conversions),
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" as const },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 10, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, font: { size: 11 } },
      },
    },
  };

  const s = data?.summary;
  const byClicks = data?.clicksByType ?? { versus: 0, results: 0, set: 0 };
  const byConv = data?.conversionsByType ?? { versus: 0, results: 0, set: 0 };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
        Shares &amp; Referrals
      </h1>
      <p className="text-sm text-gray-500 -mt-4">
        Share link performance over the last 30 days
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Total Share Clicks"
          value={s?.totalClicks ?? 0}
          icon={<Share2 className="h-5 w-5 text-blue-500" />}
        />
        <KpiCard
          title="Signups from Shares"
          value={s?.totalConversions ?? 0}
          icon={<UserPlus className="h-5 w-5 text-emerald-500" />}
          color="text-emerald-600"
        />
        <KpiCard
          title="Conversion Rate"
          value={`${s?.overallConversionRate ?? 0}%`}
          icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
          color="text-purple-600"
        />
        <KpiCard
          title="Top Platform"
          value={s?.topPlatform ?? "—"}
          icon={<Zap className="h-5 w-5 text-amber-500" />}
          color="text-amber-600"
          isText
        />
      </div>

      {/* By Type Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {(["versus", "results", "set"] as const).map((type) => {
          const clicks = byClicks[type];
          const conv = byConv[type];
          const rate =
            clicks > 0 ? Math.round((conv / clicks) * 1000) / 10 : 0;
          return (
            <div
              key={type}
              className="bg-white shadow rounded-lg p-4 text-center"
            >
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                {type === "versus"
                  ? "Challenges"
                  : type === "results"
                  ? "Results"
                  : "Sets"}
              </p>
              <p className="text-2xl font-bold text-gray-900">{clicks}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                clicks &middot; {conv} signups &middot; {rate}%
              </p>
            </div>
          );
        })}
      </div>

      {/* 30-day Chart */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
          Clicks vs. Signups (30 days)
        </h2>
        <div className="h-64">
          {timeline.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">
              No share activity in the last 30 days
            </div>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UTM Breakdown */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">
              Platform Breakdown
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Clicks
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Signups
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    CVR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(data?.utmBreakdown ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-gray-600"
                    >
                      No data
                    </td>
                  </tr>
                ) : (
                  (data?.utmBreakdown ?? []).map((row) => (
                    <tr key={row.source} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                        {row.source}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">
                        {row.clicks}
                      </td>
                      <td className="px-4 py-3 text-sm text-emerald-600 text-right">
                        {row.conversions}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            row.conversionRate >= 10
                              ? "bg-green-100 text-green-800"
                              : row.conversionRate >= 3
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {row.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Challenge Codes */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">
              Top Challenge Codes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Code
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Clicks
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Signups
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    CVR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(data?.topChallenges ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-gray-600"
                    >
                      No challenge data
                    </td>
                  </tr>
                ) : (
                  (data?.topChallenges ?? []).map((row) => {
                    const rate =
                      row.clicks > 0
                        ? Math.round((row.conversions / row.clicks) * 1000) / 10
                        : 0;
                    return (
                      <tr key={row.code} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">
                          {row.code}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-right">
                          {row.clicks}
                        </td>
                        <td className="px-4 py-3 text-sm text-emerald-600 text-right">
                          {row.conversions}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              rate >= 10
                                ? "bg-green-100 text-green-800"
                                : rate >= 3
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {rate}%
                          </span>
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
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  color,
  isText,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  isText?: boolean;
}) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-3 py-4 sm:p-5">
        <div className="flex items-center justify-between mb-1">
          <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
            {title}
          </dt>
          {icon}
        </div>
        <dd
          className={`mt-1 ${isText ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"} font-semibold truncate ${color ?? "text-gray-900"}`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}
