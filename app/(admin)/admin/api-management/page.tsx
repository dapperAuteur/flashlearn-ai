"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Key,
  Activity,
  BarChart3,
  Shield,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
} from "lucide-react";

// ============================
// Types
// ============================

interface ApiKeyEntry {
  _id: string;
  name: string;
  keyType: string;
  keyPrefix: string;
  apiTier: string;
  status: string;
  permissions: string[];
  customRateLimits?: {
    burstPerMinute?: number;
    monthlyGenerations?: number;
    monthlyApiCalls?: number;
  };
  allowedIPs?: string[];
  webhookUrl?: string;
  prioritySupport?: boolean;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface UsageData {
  overview: {
    totalActiveKeys: number;
    keysByType: Record<string, number>;
    keysByStatus: Record<string, number>;
    apiCalls24h: number;
    generations24h: number;
  };
  currentMonth: {
    period: { start: string; end: string };
    usageByType: Record<string, { apiCalls: number; generations: number; overage: number }>;
  };
  topUsers: {
    _id: string;
    totalApiCalls: number;
    totalGenerations: number;
    userName?: string;
    userEmail?: string;
  }[];
  topEndpoints: {
    endpoint: string;
    method: string;
    count: number;
    avgResponseMs: number;
  }[];
}

interface GeminiConfig {
  geminiKeyStatus: Record<string, boolean>;
  geminiModel: string;
}

const KEY_TYPE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800",
  app: "bg-blue-100 text-blue-800",
  public: "bg-green-100 text-green-800",
  admin_public: "bg-purple-100 text-purple-800",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  revoked: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

const TIER_OPTIONS = ["Free", "Developer", "Pro", "Enterprise"];

// ============================
// Component
// ============================

export default function ApiManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [geminiConfig, setGeminiConfig] = useState<GeminiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [keysFilter, setKeysFilter] = useState({ keyType: "", status: "" });
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // ============================
  // Data fetching
  // ============================

  const fetchKeys = useCallback(async () => {
    const params = new URLSearchParams();
    if (keysFilter.keyType) params.set("keyType", keysFilter.keyType);
    if (keysFilter.status) params.set("status", keysFilter.status);
    params.set("limit", "50");

    const res = await fetch(`/api/admin/api-keys?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys);
    }
  }, [keysFilter]);

  const fetchUsage = useCallback(async () => {
    const res = await fetch("/api/admin/api-usage");
    if (res.ok) {
      const data = await res.json();
      setUsage(data);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/admin/api-config");
    if (res.ok) {
      const data = await res.json();
      setGeminiConfig(data);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "Admin") {
      router.push("/dashboard");
      return;
    }

    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchKeys(), fetchUsage(), fetchConfig()]);
      setLoading(false);
    };
    loadAll();
  }, [session, status, router, fetchKeys, fetchUsage, fetchConfig]);

  // ============================
  // Key management actions
  // ============================

  const toggleKeyStatus = async (keyId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "revoked" : "active";
    const res = await fetch(`/api/admin/api-keys/${keyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setKeys(prev =>
        prev.map(k => (k._id === keyId ? { ...k, status: newStatus } : k))
      );
    }
  };

  const changeTier = async (keyId: string, newTier: string) => {
    const res = await fetch(`/api/admin/api-keys/${keyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiTier: newTier }),
    });
    if (res.ok) {
      setKeys(prev =>
        prev.map(k => (k._id === keyId ? { ...k, apiTier: newTier } : k))
      );
    }
  };

  const updateEnterprise = async (keyId: string, fields: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/api-keys/${keyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      await fetchKeys();
    }
  };

  const updateCustomLimits = async (
    keyId: string,
    limits: { burstPerMinute?: number; monthlyGenerations?: number; monthlyApiCalls?: number } | null
  ) => {
    const res = await fetch(`/api/admin/api-keys/${keyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customRateLimits: limits }),
    });
    if (res.ok) {
      setKeys(prev =>
        prev.map(k =>
          k._id === keyId
            ? { ...k, customRateLimits: limits || undefined }
            : k
        )
      );
    }
  };

  // ============================
  // Render
  // ============================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">Loading API management data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">API Management</h1>
        <button
          onClick={() => Promise.all([fetchKeys(), fetchUsage(), fetchConfig()])}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ============ Overview Cards ============ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Key className="w-5 h-5 text-blue-500" />}
          label="Active Keys"
          value={usage?.overview.totalActiveKeys || 0}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-green-500" />}
          label="API Calls (24h)"
          value={usage?.overview.apiCalls24h || 0}
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-amber-500" />}
          label="Generations (24h)"
          value={usage?.overview.generations24h || 0}
        />
        <StatCard
          icon={<Shield className="w-5 h-5 text-purple-500" />}
          label="Gemini Keys"
          value={
            geminiConfig
              ? Object.values(geminiConfig.geminiKeyStatus).filter(Boolean).length
              : 0
          }
          sublabel={`of ${geminiConfig ? Object.keys(geminiConfig.geminiKeyStatus).length : 5} configured`}
        />
      </div>

      {/* ============ Keys by Type ============ */}
      {usage?.overview.keysByType && (
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Keys by Type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(usage.overview.keysByType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${KEY_TYPE_COLORS[type] || "bg-gray-100 text-gray-700"}`}>
                  {type}
                </span>
                <span className="text-sm font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ Gemini Key Status ============ */}
      {geminiConfig && (
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Gemini Configuration
            <span className="ml-2 text-xs font-normal text-gray-500">
              Model: {geminiConfig.geminiModel}
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(geminiConfig.geminiKeyStatus).map(([key, configured]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${configured ? "bg-green-500" : "bg-red-400"}`} />
                <span className="text-xs text-gray-600">{key}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ Monthly Usage by Type ============ */}
      {usage?.currentMonth.usageByType && Object.keys(usage.currentMonth.usageByType).length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Current Month Usage by Key Type</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Key Type</th>
                  <th className="pb-2 pr-4">API Calls</th>
                  <th className="pb-2 pr-4">Generations</th>
                  <th className="pb-2">Overage</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(usage.currentMonth.usageByType).map(([type, data]) => (
                  <tr key={type} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${KEY_TYPE_COLORS[type] || "bg-gray-100"}`}>
                        {type}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono">{data.apiCalls.toLocaleString()}</td>
                    <td className="py-2 pr-4 font-mono">{data.generations.toLocaleString()}</td>
                    <td className="py-2 font-mono">{data.overage.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ Top Users ============ */}
      {usage?.topUsers && usage.topUsers.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Top API Users (This Month)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4">API Calls</th>
                  <th className="pb-2">Generations</th>
                </tr>
              </thead>
              <tbody>
                {usage.topUsers.map((u) => (
                  <tr key={u._id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{u.userName || "Unknown"}</div>
                      <div className="text-xs text-gray-500">{u.userEmail || u._id}</div>
                    </td>
                    <td className="py-2 pr-4 font-mono">{u.totalApiCalls.toLocaleString()}</td>
                    <td className="py-2 font-mono">{u.totalGenerations.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ Top Endpoints ============ */}
      {usage?.topEndpoints && usage.topEndpoints.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Top Endpoints (Last 7 Days)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Endpoint</th>
                  <th className="pb-2 pr-4">Method</th>
                  <th className="pb-2 pr-4">Calls</th>
                  <th className="pb-2">Avg Response</th>
                </tr>
              </thead>
              <tbody>
                {usage.topEndpoints.map((e, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{e.endpoint}</td>
                    <td className="py-2 pr-4">
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {e.method}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono">{e.count.toLocaleString()}</td>
                    <td className="py-2 font-mono">{e.avgResponseMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ Key Management Table ============ */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              All API Keys
            </h2>
            <div className="flex gap-2">
              <select
                value={keysFilter.keyType}
                onChange={(e) => setKeysFilter(prev => ({ ...prev, keyType: e.target.value }))}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="">All Types</option>
                <option value="admin">Admin</option>
                <option value="app">App</option>
                <option value="public">Public</option>
                <option value="admin_public">Admin Public</option>
              </select>
              <select
                value={keysFilter.status}
                onChange={(e) => setKeysFilter(prev => ({ ...prev, status: e.target.value }))}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
          </div>
        </div>

        {keys.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 text-center">No API keys found.</p>
        ) : (
          <div className="divide-y">
            {keys.map((key) => (
              <div key={key._id} className="p-4">
                {/* Key row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleKeyStatus(key._id, key.status)}
                      title={key.status === "active" ? "Click to revoke" : "Click to activate"}
                      className="flex-shrink-0"
                    >
                      {key.status === "active" ? (
                        <ToggleRight className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{key.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${KEY_TYPE_COLORS[key.keyType] || "bg-gray-100"}`}>
                          {key.keyType}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[key.status] || "bg-gray-100"}`}>
                          {key.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        <span className="font-mono">{key.keyPrefix}...</span>
                        {key.userId && (
                          <span className="ml-2">{key.userId.name} ({key.userId.email})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Tier selector */}
                    <select
                      value={key.apiTier}
                      onChange={(e) => changeTier(key._id, e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      {TIER_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>

                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-mono">{key.usageCount.toLocaleString()} calls</div>
                      <div className="text-xs text-gray-400">
                        {key.lastUsedAt
                          ? `Last: ${new Date(key.lastUsedAt).toLocaleDateString()}`
                          : "Never used"}
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedKey(expandedKey === key._id ? null : key._id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedKey === key._id ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedKey === key._id && (
                  <ExpandedKeyDetails
                    apiKey={key}
                    onUpdateLimits={(limits) => updateCustomLimits(key._id, limits)}
                    onUpdateEnterprise={updateEnterprise}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================
// Sub-components
// ============================

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sublabel?: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sublabel && <div className="text-xs text-gray-400 mt-0.5">{sublabel}</div>}
    </div>
  );
}

function ExpandedKeyDetails({
  apiKey,
  onUpdateLimits,
  onUpdateEnterprise,
}: {
  apiKey: ApiKeyEntry;
  onUpdateLimits: (limits: { burstPerMinute?: number; monthlyGenerations?: number; monthlyApiCalls?: number } | null) => void;
  onUpdateEnterprise: (keyId: string, fields: Record<string, unknown>) => void;
}) {
  const [burst, setBurst] = useState(apiKey.customRateLimits?.burstPerMinute?.toString() || "");
  const [monthlyGens, setMonthlyGens] = useState(apiKey.customRateLimits?.monthlyGenerations?.toString() || "");
  const [monthlyCalls, setMonthlyCalls] = useState(apiKey.customRateLimits?.monthlyApiCalls?.toString() || "");
  const [allowedIPs, setAllowedIPs] = useState(apiKey.allowedIPs?.join(", ") || "");
  const [webhookUrl, setWebhookUrl] = useState(apiKey.webhookUrl || "");
  const [prioritySupport, setPrioritySupport] = useState(apiKey.prioritySupport || false);

  const handleSaveLimits = () => {
    const limits: { burstPerMinute?: number; monthlyGenerations?: number; monthlyApiCalls?: number } = {};
    if (burst) limits.burstPerMinute = parseInt(burst);
    if (monthlyGens) limits.monthlyGenerations = parseInt(monthlyGens);
    if (monthlyCalls) limits.monthlyApiCalls = parseInt(monthlyCalls);
    onUpdateLimits(Object.keys(limits).length > 0 ? limits : null);
  };

  const handleSaveEnterprise = () => {
    const ips = allowedIPs
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);
    onUpdateEnterprise(apiKey._id, {
      allowedIPs: ips.length > 0 ? ips : [],
      webhookUrl: webhookUrl.trim() || undefined,
      prioritySupport,
    });
  };

  return (
    <div className="mt-3 pt-3 border-t space-y-3">
      <div>
        <h4 className="text-xs font-semibold text-gray-600 mb-1">Permissions</h4>
        <div className="flex flex-wrap gap-1">
          {apiKey.permissions.map((p, i) => (
            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
              {p}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-600 mb-2">
          Custom Rate Limits
          <span className="font-normal text-gray-400 ml-1">(blank = use tier defaults)</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500">Burst/min</label>
            <input type="number" value={burst} onChange={(e) => setBurst(e.target.value)}
              placeholder="Default" className="w-full text-xs border rounded px-2 py-1 mt-0.5" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Monthly Generations</label>
            <input type="number" value={monthlyGens} onChange={(e) => setMonthlyGens(e.target.value)}
              placeholder="Default" className="w-full text-xs border rounded px-2 py-1 mt-0.5" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Monthly API Calls</label>
            <input type="number" value={monthlyCalls} onChange={(e) => setMonthlyCalls(e.target.value)}
              placeholder="Default" className="w-full text-xs border rounded px-2 py-1 mt-0.5" />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={handleSaveLimits}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Save Limits</button>
          <button onClick={() => { setBurst(""); setMonthlyGens(""); setMonthlyCalls(""); onUpdateLimits(null); }}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Reset to Defaults</button>
        </div>
      </div>

      {/* Enterprise Features */}
      <div>
        <h4 className="text-xs font-semibold text-gray-600 mb-2">Enterprise Features</h4>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500">Allowed IPs <span className="text-gray-400">(comma-separated, CIDR supported, blank = all)</span></label>
            <input type="text" value={allowedIPs} onChange={(e) => setAllowedIPs(e.target.value)}
              placeholder="e.g. 203.0.113.5, 10.0.0.0/8"
              className="w-full text-xs border rounded px-2 py-1 mt-0.5 font-mono" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Webhook URL <span className="text-gray-400">(usage milestone notifications)</span></label>
            <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full text-xs border rounded px-2 py-1 mt-0.5" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id={`priority-${apiKey._id}`} checked={prioritySupport}
              onChange={(e) => setPrioritySupport(e.target.checked)}
              className="rounded border-gray-300" />
            <label htmlFor={`priority-${apiKey._id}`} className="text-xs text-gray-600">Priority Support</label>
          </div>
          <button onClick={handleSaveEnterprise}
            className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">Save Enterprise Settings</button>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Created: {new Date(apiKey.createdAt).toLocaleString()}
        {apiKey.lastUsedAt && (
          <span className="ml-3">Last used: {new Date(apiKey.lastUsedAt).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}
