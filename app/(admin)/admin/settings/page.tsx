/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Switch } from "@headlessui/react";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import {
  CONFIG_SCHEMAS,
  MANAGED_ELSEWHERE_KEYS,
  SCALAR_VALUE_KEY,
  fieldTypeHint,
  validateConfigValue,
  type ConfigField,
  type ConfigSchema,
} from "@/lib/admin/configSchema";

const FEATURE_FLAGS_KEY = "FEATURE_FLAGS";

interface ConfigEntry {
  _id: string;
  key: string;
  value: any;
  description?: string;
  updatedAt: string;
}

/** Form value for a single field: boolean for checkboxes, string for everything else. */
type FieldValue = string | boolean;
type ConfigFormState = Record<string, Record<string, FieldValue>>; // [configKey][fieldName]

/** Seed a field's form value from a stored value (or empty). */
function initFieldValue(field: ConfigField, stored: any): FieldValue {
  if (field.type === "boolean") return Boolean(stored);
  if (stored === undefined || stored === null) return "";
  return String(stored);
}

/** Parse a form input back into its typed value for saving/validation. */
function parseFieldValue(field: ConfigField, raw: FieldValue): any {
  if (field.type === "boolean") return Boolean(raw);
  const str = typeof raw === "string" ? raw.trim() : "";
  if (field.type === "number") return str === "" ? undefined : Number(str);
  return str; // string | text | select | url | datetime
}

/** Build the typed config value (object or scalar) from the field form state. */
function buildConfigValue(schema: ConfigSchema, state: Record<string, FieldValue>): any {
  if (schema.kind === "scalar") {
    return parseFieldValue(schema.fields[0], state[SCALAR_VALUE_KEY]);
  }
  const obj: Record<string, any> = {};
  for (const field of schema.fields) {
    obj[field.name] = parseFieldValue(field, state[field.name]);
  }
  return obj;
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Guided forms (schema-driven)
  const [formState, setFormState] = useState<ConfigFormState>({});
  const [formErrors, setFormErrors] = useState<Record<string, Record<string, string>>>({});

  // Raw fallback editor (for DB keys without a schema)
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const [seedingHelp, setSeedingHelp] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [audioFlag, setAudioFlag] = useState(false);
  const [audioFlagSaving, setAudioFlagSaving] = useState(false);

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
        const dbConfigs: ConfigEntry[] = data.configs || [];
        setConfigs(dbConfigs);

        // Feature-flags toggle
        const flagsDoc = dbConfigs.find((c) => c.key === FEATURE_FLAGS_KEY);
        setAudioFlag(Boolean(flagsDoc?.value?.audioGeneration));

        // Seed guided-form state from stored values (or empty defaults).
        const nextForm: ConfigFormState = {};
        for (const schema of CONFIG_SCHEMAS) {
          const stored = dbConfigs.find((c) => c.key === schema.key)?.value;
          const fieldVals: Record<string, FieldValue> = {};
          if (schema.kind === "scalar") {
            fieldVals[SCALAR_VALUE_KEY] = initFieldValue(schema.fields[0], stored);
          } else {
            for (const field of schema.fields) {
              fieldVals[field.name] = initFieldValue(field, stored?.[field.name]);
            }
          }
          nextForm[schema.key] = fieldVals;
        }
        setFormState(nextForm);

        // Raw fallback for any DB key without a schema (and not managed elsewhere).
        const known = new Set(CONFIG_SCHEMAS.map((s) => s.key));
        const rawVals: Record<string, string> = {};
        for (const c of dbConfigs) {
          if (known.has(c.key) || MANAGED_ELSEWHERE_KEYS.has(c.key)) continue;
          rawVals[c.key] = typeof c.value === "object" ? JSON.stringify(c.value, null, 2) : String(c.value);
        }
        setEditValues(rawVals);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, [session, status, router]);

  const setField = (key: string, name: string, value: FieldValue) => {
    setFormState((prev) => ({ ...prev, [key]: { ...prev[key], [name]: value } }));
    // Clear that field's error as the admin edits it.
    setFormErrors((prev) => {
      if (!prev[key]?.[name]) return prev;
      const next = { ...prev, [key]: { ...prev[key] } };
      delete next[key][name];
      return next;
    });
  };

  const persistConfig = async (key: string, value: any, description: string) => {
    const res = await fetch("/api/admin/configs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value, description }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to save");
    }
    const data = await res.json();
    if (data?.config) {
      setConfigs((prev) => {
        const idx = prev.findIndex((c) => c.key === key);
        if (idx === -1) return [...prev, data.config];
        const next = [...prev];
        next[idx] = data.config;
        return next;
      });
    }
  };

  const handleSaveSchema = async (schema: ConfigSchema) => {
    const value = buildConfigValue(schema, formState[schema.key] || {});
    const { ok, errors } = validateConfigValue(schema, value);
    if (!ok) {
      setFormErrors((prev) => ({ ...prev, [schema.key]: errors }));
      return;
    }
    setFormErrors((prev) => ({ ...prev, [schema.key]: {} }));
    setSaving(schema.key);
    setSaved(null);
    try {
      await persistConfig(schema.key, value, schema.description);
      setSaved(schema.key);
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveRaw = async (key: string) => {
    setSaving(key);
    setSaved(null);
    try {
      const raw = editValues[key];
      let value: any;
      try {
        value = JSON.parse(raw);
      } catch {
        value = isNaN(Number(raw)) ? raw : Number(raw);
      }
      await persistConfig(key, value, "");
      setSaved(key);
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const handleToggleAudio = async (next: boolean) => {
    setAudioFlag(next); // optimistic
    setAudioFlagSaving(true);
    try {
      await persistConfig(
        FEATURE_FLAGS_KEY,
        { audioGeneration: next },
        "Feature flags. audioGeneration: show audio flashcard generation to all users (admins always have access).",
      );
    } catch (err) {
      alert((err as Error).message);
      setAudioFlag(!next); // revert
    } finally {
      setAudioFlagSaving(false);
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

  const getUpdatedAt = (key: string) => configs.find((c) => c.key === key)?.updatedAt;
  const isNew = (key: string) => !configs.find((c) => c.key === key);

  // Unknown DB keys (no schema, not managed elsewhere) → raw editor fallback.
  const knownKeys = new Set(CONFIG_SCHEMAS.map((s) => s.key));
  const rawKeys = configs
    .map((c) => c.key)
    .filter((k) => !knownKeys.has(k) && !MANAGED_ELSEWHERE_KEYS.has(k));

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">App Configuration</h1>
      <p className="text-sm text-gray-500 mb-6">
        Each setting is a guided form — fill in the fields and Save. Values are checked before they&apos;re stored.
      </p>

      {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* System Actions */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">System Actions</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={async () => {
              setSeedingHelp(true);
              setSeedResult(null);
              try {
                const res = await fetch("/api/admin/help/seed", { method: "POST" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Seed failed");
                setSeedResult(`${data.created} articles created, ${data.skipped} already existed`);
              } catch (err) {
                setSeedResult(`Error: ${(err as Error).message}`);
              } finally {
                setSeedingHelp(false);
              }
            }}
            disabled={seedingHelp}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Seed default help center articles"
          >
            {seedingHelp ? "Seeding..." : "Seed Help Articles"}
          </button>
          <p className="text-xs text-gray-500">
            Populate the help center with default articles. Safe to run multiple times (skips existing).
          </p>
        </div>
        {seedResult && (
          <p className={`mt-2 text-sm ${seedResult.startsWith("Error") ? "text-red-600" : "text-green-600"}`} role="status">
            {seedResult}
          </p>
        )}
      </div>

      {/* Feature Flags */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Feature Flags</h2>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Audio flashcard generation</p>
            <p className="text-xs text-gray-500 mt-0.5">
              When off, audio shows as &quot;coming soon&quot; to everyone except admins (who always have access). Turn it
              on to launch for all users. Audio runs on Gemini — make sure the Gemini key is active first.
            </p>
          </div>
          <Switch
            checked={audioFlag}
            onChange={handleToggleAudio}
            disabled={audioFlagSaving}
            className={`${audioFlag ? "bg-green-600" : "bg-gray-300"} relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50`}
          >
            <span className="sr-only">Toggle audio flashcard generation</span>
            <span className={`${audioFlag ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
          </Switch>
        </div>
        <p className={`mt-2 text-xs ${audioFlag ? "text-green-600" : "text-gray-500"}`} role="status">
          {audioFlagSaving ? "Saving…" : audioFlag ? "On — available to all users" : "Off — coming soon (admins only)"}
        </p>
      </div>

      {/* Managed on dedicated pages */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Managed on dedicated pages</h2>
        <p className="text-xs text-gray-500 mb-3">These settings have their own full editors — they aren&apos;t shown below to avoid two places editing the same thing.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/admin/api-management"
            className="flex-1 rounded-lg border border-gray-200 p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
          >
            <p className="text-sm font-medium text-gray-900">API Rate Limits</p>
            <p className="text-xs text-gray-500 mt-0.5">Per key-type and tier (burst, monthly generations, monthly calls) → API Management</p>
          </Link>
          <Link
            href="/admin/seo"
            className="flex-1 rounded-lg border border-gray-200 p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
          >
            <p className="text-sm font-medium text-gray-900">SEO Metadata</p>
            <p className="text-xs text-gray-500 mt-0.5">Per-page titles and descriptions → SEO settings</p>
          </Link>
        </div>
      </div>

      {/* Guided config forms */}
      <div className="space-y-4">
        {CONFIG_SCHEMAS.map((schema) => {
          const errs = formErrors[schema.key] || {};
          const state = formState[schema.key] || {};
          return (
            <div key={schema.key} className="bg-white shadow rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                    {schema.label}
                    {isNew(schema.key) && (
                      <span className="ml-2 text-xs font-normal bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Not saved yet</span>
                    )}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{schema.description}</p>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{schema.key}</p>
                </div>
                {getUpdatedAt(schema.key) && (
                  <span className="text-xs text-gray-600 flex-shrink-0">
                    Updated {new Date(getUpdatedAt(schema.key)!).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className={`mt-3 grid gap-4 ${schema.kind === "object" && schema.fields.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                {schema.fields.map((field) => (
                  <ConfigFieldInput
                    key={field.name}
                    field={field}
                    value={state[field.name]}
                    error={errs[field.name]}
                    onChange={(v) => setField(schema.key, field.name, v)}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => handleSaveSchema(schema)}
                  disabled={saving === schema.key}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving === schema.key ? "Saving..." : "Save"}
                </button>
                {saved === schema.key && (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    Saved
                  </span>
                )}
                {Object.keys(errs).length > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm text-red-600">
                    <ExclamationCircleIcon className="h-4 w-4" />
                    Fix the highlighted fields
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Raw fallback for unrecognized keys */}
        {rawKeys.map((key) => {
          const raw = editValues[key] || "";
          const isObject = raw.trim().startsWith("{") || raw.trim().startsWith("[");
          return (
            <div key={key} className="bg-white shadow rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 font-mono">{key}</h3>
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Raw editor (no schema)</span>
              </div>
              {isObject ? (
                <textarea
                  value={raw}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={raw}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => handleSaveRaw(key)}
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

function ConfigFieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: ConfigField;
  value: FieldValue | undefined;
  error?: string;
  onChange: (value: FieldValue) => void;
}) {
  const inputId = `cfg-${field.name}`;
  const describedBy = `${inputId}-help${error ? ` ${inputId}-error` : ""}`;
  const baseInput = `w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500 ${error ? "border-red-400" : "border-gray-300"}`;

  if (field.type === "boolean") {
    return (
      <div className="flex items-start gap-3">
        <input
          id={inputId}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={describedBy}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div>
          <label htmlFor={inputId} className="text-sm font-medium text-gray-900">
            {field.label}
          </label>
          {field.help && (
            <p id={`${inputId}-help`} className="text-xs text-gray-500 mt-0.5">
              {field.help}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-900">
        {field.label}
        {field.required === false && <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>}
      </label>
      <p className="text-[11px] text-gray-400 mb-1">{fieldTypeHint(field)}</p>

      {field.type === "select" ? (
        <select
          id={inputId}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          className={baseInput}
        >
          <option value="">Select…</option>
          {(field.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "text" ? (
        <textarea
          id={inputId}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={field.sample}
          maxLength={field.maxLength}
          aria-describedby={describedBy}
          className={baseInput}
        />
      ) : (
        <input
          id={inputId}
          type={field.type === "number" ? "number" : "text"}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.sample}
          min={field.type === "number" ? field.min : undefined}
          max={field.type === "number" ? field.max : undefined}
          step={field.type === "number" && field.integer ? 1 : undefined}
          maxLength={field.type === "string" ? field.maxLength : undefined}
          aria-describedby={describedBy}
          className={baseInput}
        />
      )}

      {field.help && (
        <p id={`${inputId}-help`} className="text-xs text-gray-500 mt-1">
          {field.help}
          {field.sample && ` (e.g. ${field.sample})`}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
