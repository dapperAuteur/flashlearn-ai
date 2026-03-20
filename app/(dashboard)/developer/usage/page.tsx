"use client";

import { useState, useEffect } from "react";
import { BarChart3, Zap, Clock } from "lucide-react";

interface KeyUsage {
  id: string;
  name: string;
  keyType: string;
  keyPrefix: string;
  apiTier: string;
  status: string;
  usage: { apiCalls: number; generationCalls: number; overageCalls: number };
  limits: { burstPerMinute: number | null; monthlyGenerations: number | null; monthlyApiCalls: number | null };
  activity24h: { calls: number; avgResponseMs: number };
}

interface UsageData {
  currentPeriod: { start: string; end: string };
  keys: KeyUsage[];
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/developer/usage")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data || data.keys.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No Usage Data</h3>
        <p className="text-sm text-gray-500">Create an API key and start making requests to see usage data here.</p>
      </div>
    );
  }

  const periodLabel = data.currentPeriod
    ? `${new Date(data.currentPeriod.start).toLocaleDateString()} — ${new Date(data.currentPeriod.end).toLocaleDateString()}`
    : "";

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        Current billing period: <span className="font-medium text-gray-700">{periodLabel}</span>
      </div>

      {/* Per-key usage cards */}
      <div className="space-y-4">
        {data.keys.map((key) => (
          <div key={key.id} className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{key.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${key.keyType === "public" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                    {key.keyType}
                  </span>
                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{key.apiTier}</span>
                </div>
                <span className="text-xs text-gray-400 font-mono">{key.keyPrefix}...</span>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* API Calls */}
                <UsageMetric
                  icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
                  label="API Calls"
                  value={key.usage.apiCalls}
                  limit={key.limits.monthlyApiCalls}
                />
                {/* Generations */}
                <UsageMetric
                  icon={<Zap className="w-4 h-4 text-amber-500" />}
                  label="Generations"
                  value={key.usage.generationCalls}
                  limit={key.limits.monthlyGenerations}
                />
                {/* 24h Activity */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">24h Calls</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{key.activity24h.calls.toLocaleString()}</div>
                </div>
                {/* Avg Response */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Avg Response</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {key.activity24h.avgResponseMs ? `${key.activity24h.avgResponseMs}ms` : "—"}
                  </div>
                </div>
              </div>

              {/* Overage warning */}
              {key.usage.overageCalls > 0 && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  {key.usage.overageCalls.toLocaleString()} overage calls this period.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsageMetric({
  icon,
  label,
  value,
  limit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  limit: number | null;
}) {
  const percentage = limit ? Math.min(100, (value / limit) * 100) : 0;
  const isNearLimit = limit ? percentage >= 80 : false;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-lg font-bold text-gray-900">
        {value.toLocaleString()}
        {limit && <span className="text-sm font-normal text-gray-400"> / {limit.toLocaleString()}</span>}
      </div>
      {limit && (
        <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${isNearLimit ? "bg-amber-500" : "bg-blue-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
