"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Key, BarChart3, Zap, ArrowRight } from "lucide-react";

interface UsageSummary {
  currentPeriod: { start: string; end: string };
  keys: {
    id: string;
    name: string;
    keyType: string;
    keyPrefix: string;
    apiTier: string;
    status: string;
    usage: { apiCalls: number; generationCalls: number };
    limits: { monthlyGenerations: number | null; monthlyApiCalls: number | null };
    activity24h: { calls: number };
  }[];
}

export default function DeveloperOverview() {
  const [data, setData] = useState<UsageSummary | null>(null);
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

  const activeKeys = data?.keys?.filter((k) => k.status === "active") || [];
  const totalCalls = activeKeys.reduce((sum, k) => sum + k.usage.apiCalls, 0);
  const totalGens = activeKeys.reduce((sum, k) => sum + k.usage.generationCalls, 0);
  const calls24h = activeKeys.reduce((sum, k) => sum + k.activity24h.calls, 0);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Key className="w-5 h-5 text-blue-500" />} label="Active Keys" value={activeKeys.length} />
        <StatCard icon={<BarChart3 className="w-5 h-5 text-green-500" />} label="API Calls (Month)" value={totalCalls} />
        <StatCard icon={<Zap className="w-5 h-5 text-amber-500" />} label="Generations (Month)" value={totalGens} />
        <StatCard icon={<BarChart3 className="w-5 h-5 text-purple-500" />} label="Calls (24h)" value={calls24h} />
      </div>

      {/* Keys Summary */}
      {activeKeys.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Key className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No API Keys Yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Create your first API key to start using the FlashLearn API.
          </p>
          <Link
            href="/developer/keys"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Create API Key
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Your API Keys</h2>
            <Link href="/developer/keys" className="text-xs text-blue-600 hover:underline">
              Manage Keys
            </Link>
          </div>
          <div className="divide-y">
            {activeKeys.map((key) => (
              <div key={key.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{key.name}</span>
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                      {key.apiTier}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{key.keyPrefix}...</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">
                    {key.usage.apiCalls.toLocaleString()}
                    {key.limits.monthlyApiCalls && (
                      <span className="text-gray-400"> / {key.limits.monthlyApiCalls.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">API calls this month</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/developer/usage"
          className="bg-white rounded-lg border p-4 hover:border-blue-300 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">Usage Analytics</h3>
              <p className="text-xs text-gray-500">View detailed usage breakdowns and history</p>
            </div>
          </div>
        </Link>
        <Link
          href="/developer/keys"
          className="bg-white rounded-lg border p-4 hover:border-blue-300 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">API Keys</h3>
              <p className="text-xs text-gray-500">Create, rotate, and revoke API keys</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value.toLocaleString()}</div>
    </div>
  );
}
