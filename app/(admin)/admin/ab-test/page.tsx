"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw, TrendingUp, AlertCircle, FlaskConical } from "lucide-react";

interface VariantStats {
  variant: string;
  views: number;
  signups: number;
  signins: number;
  generates: number;
  studies: number;
  dashboards: number;
  conversionRate: number;
  engagementRate: number;
}

interface AbTestResponse {
  test: string;
  enabled: boolean;
  variants: VariantStats[];
  totalViews: number;
  generatedAt: string;
}

const VARIANT_LABEL: Record<string, string> = {
  control: "Control (current homepage)",
  a: "Variant A",
  b: "Variant B",
  c: "Variant C",
};

/**
 * Two-proportion z-test of a variant's sign-up conversion against control.
 * Returns null until both arms clear a minimum sample so the page never reports
 * a result it cannot support. |z| >= 1.96 corresponds to roughly 95% confidence.
 */
function significanceVsControl(variant: VariantStats, control: VariantStats) {
  const n1 = control.views;
  const n2 = variant.views;
  if (n1 < 100 || n2 < 100) return null;
  const p1 = control.signups / n1;
  const p2 = variant.signups / n2;
  const pPool = (control.signups + variant.signups) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  if (se === 0) return null;
  const z = (p2 - p1) / se;
  return { z, significant: Math.abs(z) >= 1.96, lift: p1 > 0 ? ((p2 - p1) / p1) * 100 : 0 };
}

export default function AbTestDashboardPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<AbTestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/ab-test?test=home-hero", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  if (status === "loading") {
    return (
      <p className="p-6 text-gray-700" role="status" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (status !== "authenticated" || session?.user?.role !== "Admin") {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin access required</h1>
        <p className="mt-2 text-gray-700">You need an administrator account to view A/B test results.</p>
      </main>
    );
  }

  const control = data?.variants.find((v) => v.variant === "control");
  const leader = data?.variants
    .filter((v) => v.views >= 100)
    .reduce<VariantStats | null>(
      (best, v) => (best === null || v.conversionRate > best.conversionRate ? v : best),
      null,
    );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-7 w-7 text-blue-600" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Homepage A/B test</h1>
            <p className="text-sm text-gray-600">Sign-up conversion by homepage variant.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Test status */}
      {data && !data.enabled && (
        <div
          className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
          role="note"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm text-amber-900">
            The test is <strong>off</strong>. Every visitor sees the control. Set
            <code className="mx-1 rounded bg-amber-100 px-1 py-0.5">HOMEPAGE_AB_TEST_ENABLED=true</code>
            to start splitting traffic. Existing data below still shows.
          </p>
        </div>
      )}

      <p className="mb-4 text-sm text-gray-600" role="status" aria-live="polite">
        {error
          ? ""
          : data
            ? `${data.totalViews.toLocaleString()} total views · updated ${new Date(
                data.generatedAt,
              ).toLocaleString()}`
            : loading
              ? "Loading results…"
              : ""}
      </p>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {leader && control && leader.variant !== "control" && (
        <div
          className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4"
          role="note"
        >
          <TrendingUp className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" aria-hidden="true" />
          <p className="text-sm text-green-900">
            <strong>{VARIANT_LABEL[leader.variant] ?? leader.variant}</strong> leads on conversion
            ({leader.conversionRate.toFixed(1)}% vs {control.conversionRate.toFixed(1)}% control).
            {(() => {
              const sig = significanceVsControl(leader, control);
              if (!sig) return " Not enough data yet for a confidence read.";
              return sig.significant
                ? ` This is statistically significant (z=${sig.z.toFixed(2)}, ~95% confidence).`
                : ` Not yet statistically significant (z=${sig.z.toFixed(2)}).`;
            })()}
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <caption className="sr-only">
            Homepage A/B test results by variant: views, sign-ups, conversion rate, generate clicks,
            study clicks, and engagement rate.
          </caption>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-900">
                Variant
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                Views
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                Sign-ups
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                Conversion
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                Generate
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                Study
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-900">
                Engagement
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.variants.map((v) => {
              const isLeader = leader?.variant === v.variant;
              return (
                <tr key={v.variant} className={isLeader ? "bg-green-50" : undefined}>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-gray-900">
                    {VARIANT_LABEL[v.variant] ?? v.variant}
                    {isLeader && (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        Leading
                      </span>
                    )}
                  </th>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {v.views.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {v.signups.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                    {v.conversionRate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {v.generates.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {v.studies.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {v.engagementRate.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
            {!loading && data?.variants.every((v) => v.views === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No events recorded yet. Enable the test and drive homepage traffic to populate this
                  table.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Conversion = sign-up clicks ÷ views. Engagement = (generate + study clicks) ÷ views.
        Significance is a two-proportion z-test of each variant&apos;s conversion against control and
        is shown only once both arms pass 100 views.
      </p>
    </main>
  );
}
