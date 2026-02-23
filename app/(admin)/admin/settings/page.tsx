/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

interface ConfigEntry {
  _id: string;
  key: string;
  value: any;
  description?: string;
  updatedAt: string;
}

// Default configs to show even if not yet in DB
const DEFAULT_CONFIGS = [
  {
    key: "RATE_LIMITS",
    description: "AI generation limits per subscription tier (per 30-day window)",
    defaultValue: {
      Admin: 999999,
      "Lifetime Learner": 999999,
      "Annual Pro": 999999,
      "Monthly Pro": 999999,
      Free: 1,
    },
  },
  {
    key: "FLASHCARD_MAX",
    description: "Maximum number of flashcards per set",
    defaultValue: 100,
  },
  {
    key: "PROMO_LIFETIME_ACTIVE",
    description: "Whether the lifetime promotion is currently active (true/false)",
    defaultValue: true,
  },
  {
    key: "PROMO_LIFETIME_PRICE_CENTS",
    description: "Promotional lifetime price in cents (10000 = $100)",
    defaultValue: 10000,
  },
];

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "Admin") {
      router.push("/dashboard");
      return;
    }

    const fetchConfigs = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/configs");
        if (!res.ok) throw new Error("Failed to fetch configs");
        const data = await res.json();
        setConfigs(data.configs || []);

        // Initialize edit values
        const values: Record<string, string> = {};
        for (const c of data.configs || []) {
          values[c.key] = typeof c.value === "object" ? JSON.stringify(c.value, null, 2) : String(c.value);
        }
        // Add defaults for missing configs
        for (const d of DEFAULT_CONFIGS) {
          if (!values[d.key]) {
            values[d.key] = typeof d.defaultValue === "object"
              ? JSON.stringify(d.defaultValue, null, 2)
              : String(d.defaultValue);
          }
        }
        setEditValues(values);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, [session, status, router]);

  const handleSave = async (key: string, description?: string) => {
    setSaving(key);
    setSaved(null);
    try {
      const raw = editValues[key];
      let value: any;
      try {
        value = JSON.parse(raw);
      } catch {
        // If not valid JSON, store as string or number
        value = isNaN(Number(raw)) ? raw : Number(raw);
      }

      const res = await fetch("/api/admin/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to save");
        return;
      }

      setSaved(key);
      setTimeout(() => setSaved(null), 3000);
    } catch {
      alert("Failed to save configuration");
    } finally {
      setSaving(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-3 text-gray-500 text-sm">Loading settings...</p>
      </div>
    );
  }

  // Merge existing configs with defaults
  const allKeys = new Set([
    ...configs.map((c) => c.key),
    ...DEFAULT_CONFIGS.map((d) => d.key),
  ]);

  const configCards = Array.from(allKeys).map((key) => {
    const existing = configs.find((c) => c.key === key);
    const defaultDef = DEFAULT_CONFIGS.find((d) => d.key === key);
    return {
      key,
      description: existing?.description || defaultDef?.description || "",
      updatedAt: existing?.updatedAt,
      isNew: !existing,
    };
  });

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">
        App Configuration
      </h1>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="space-y-4">
        {configCards.map(({ key, description, updatedAt, isNew }) => {
          const isObject = (editValues[key] || "").trim().startsWith("{") || (editValues[key] || "").trim().startsWith("[");

          return (
            <div key={key} className="bg-white shadow rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 font-mono">
                    {key}
                    {isNew && (
                      <span className="ml-2 text-xs font-normal bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                        Not saved yet
                      </span>
                    )}
                  </h3>
                  {description && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{description}</p>
                  )}
                </div>
                {updatedAt && (
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    Updated {new Date(updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {isObject ? (
                <textarea
                  value={editValues[key] || ""}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={editValues[key] || ""}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              )}

              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => handleSave(key, description)}
                  disabled={saving === key}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving === key ? "Saving..." : "Save"}
                </button>
                {saved === key && (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    Saved
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
