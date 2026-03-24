"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Key, Plus, RotateCw, Trash2, Copy, Check, Eye, EyeOff } from "lucide-react";

interface ApiKeyEntry {
  id?: string;
  _id?: string;
  name: string;
  keyType: string;
  keyPrefix: string;
  apiTier: string;
  status: string;
  permissions: string[];
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
}

const KEY_TYPE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800",
  app: "bg-blue-100 text-blue-800",
  public: "bg-green-100 text-green-800",
  admin_public: "bg-purple-100 text-purple-800",
};

export default function KeysPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "Admin";

  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState<string>("public");
  const [creating, setCreating] = useState(false);
  const [newPlaintextKey, setNewPlaintextKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch("/api/developer/keys");
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/developer/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim(), keyType: newKeyType }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewPlaintextKey(data.key);
      setNewKeyName("");
      await fetchKeys();
    }
    setCreating(false);
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this key? This cannot be undone.")) return;
    const res = await fetch(`/api/developer/keys/${keyId}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((prev) => prev.map((k) => (k._id === keyId || k.id === keyId) ? { ...k, status: "revoked" } : k));
    }
  };

  const rotateKey = async (keyId: string) => {
    if (!confirm("This will revoke the current key and generate a new one. Continue?")) return;
    const res = await fetch(`/api/developer/keys/${keyId}/rotate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setNewPlaintextKey(data.key);
      await fetchKeys();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New key reveal banner */}
      {newPlaintextKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">
            Save your API key now — it won&apos;t be shown again
          </h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border rounded px-3 py-2 text-sm font-mono text-gray-800 overflow-x-auto">
              {showKey ? newPlaintextKey : newPlaintextKey.slice(0, 16) + "•".repeat(32)}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 hover:bg-amber-100 rounded"
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff className="w-4 h-4 text-amber-700" /> : <Eye className="w-4 h-4 text-amber-700" />}
            </button>
            <button
              onClick={() => copyToClipboard(newPlaintextKey)}
              className="p-2 hover:bg-amber-100 rounded"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-amber-700" />
              )}
            </button>
          </div>
          <button
            onClick={() => { setNewPlaintextKey(null); setShowKey(false); }}
            className="mt-2 text-xs text-amber-600 hover:underline"
          >
            I&apos;ve saved it, dismiss
          </button>
        </div>
      )}

      {/* Create key */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">API Keys</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" />
            New Key
          </button>
        </div>

        {showCreate && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Key name (e.g., Production, Testing)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 text-sm border rounded-lg px-3 py-2"
                maxLength={100}
              />
              {isAdmin && (
                <select
                  value={newKeyType}
                  onChange={(e) => setNewKeyType(e.target.value)}
                  className="text-sm border rounded-lg px-3 py-2"
                >
                  <option value="public">Public</option>
                  <option value="admin">Admin</option>
                  <option value="app">App</option>
                  <option value="admin_public">Admin Public</option>
                </select>
              )}
              <button
                onClick={createKey}
                disabled={creating || !newKeyName.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        )}

        {/* Keys list */}
        {keys.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="divide-y">
            {keys.map((key) => {
              const keyId = key._id || key.id || "";
              return (
                <div key={keyId} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{key.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${KEY_TYPE_COLORS[key.keyType] || "bg-gray-100"}`}>
                        {key.keyType}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${key.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                        {key.status}
                      </span>
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        {key.apiTier}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 font-mono">{key.keyPrefix}...</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {key.usageCount.toLocaleString()} total calls
                      {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    </div>
                  </div>

                  {key.status === "active" && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => rotateKey(keyId)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Rotate key"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => revokeKey(keyId)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Revoke key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
