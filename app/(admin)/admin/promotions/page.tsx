"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, TrashIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

interface Promotion {
  _id: string;
  slug: string;
  name: string;
  flatLimit: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  bannerMessage: string;
  bannerLink?: string;
  bannerLinkLabel?: string;
  pricingCallout: string;
  pricingTierBadge: string;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  slug: string;
  name: string;
  flatLimit: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  bannerMessage: string;
  bannerLink: string;
  bannerLinkLabel: string;
  pricingCallout: string;
  pricingTierBadge: string;
}

const EMPTY_FORM: FormState = {
  slug: "",
  name: "",
  flatLimit: "20",
  startsAt: "",
  endsAt: "",
  active: true,
  bannerMessage: "",
  bannerLink: "/pricing",
  bannerLinkLabel: "See plans",
  pricingCallout: "",
  pricingTierBadge: "",
};

function statusOf(p: Promotion, now: number = Date.now()): "upcoming" | "active" | "ended" | "disabled" {
  if (!p.active) return "disabled";
  const start = new Date(p.startsAt).getTime();
  const end = new Date(p.endsAt).getTime();
  if (now < start) return "upcoming";
  if (now >= end) return "ended";
  return "active";
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  upcoming: "bg-blue-100 text-blue-800",
  ended: "bg-gray-100 text-gray-700",
  disabled: "bg-yellow-100 text-yellow-800",
};

export default function AdminPromotionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promotions");
      if (!res.ok) throw new Error("Failed to fetch promotions");
      const data = await res.json();
      setPromotions(data.promotions || []);
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
    fetchPromotions();
  }, [session, status, router, fetchPromotions]);

  const beginEdit = (p: Promotion) => {
    setEditingSlug(p.slug);
    setForm({
      slug: p.slug,
      name: p.name,
      flatLimit: String(p.flatLimit),
      startsAt: p.startsAt.slice(0, 16),
      endsAt: p.endsAt.slice(0, 16),
      active: p.active,
      bannerMessage: p.bannerMessage,
      bannerLink: p.bannerLink ?? "",
      bannerLinkLabel: p.bannerLinkLabel ?? "",
      pricingCallout: p.pricingCallout,
      pricingTierBadge: p.pricingTierBadge,
    });
  };

  const cancelEdit = () => {
    setEditingSlug(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const flatLimit = Number(form.flatLimit);
      if (!Number.isFinite(flatLimit) || flatLimit < 1) {
        throw new Error("flatLimit must be a positive number.");
      }

      const payload = {
        slug: form.slug,
        name: form.name,
        flatLimit,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        active: form.active,
        bannerMessage: form.bannerMessage,
        bannerLink: form.bannerLink,
        bannerLinkLabel: form.bannerLinkLabel,
        pricingCallout: form.pricingCallout,
        pricingTierBadge: form.pricingTierBadge,
      };

      const url = editingSlug ? `/api/admin/promotions/${editingSlug}` : "/api/admin/promotions";
      const method = editingSlug ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save promotion");

      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      cancelEdit();
      await fetchPromotions();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete the "${slug}" promotion? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/promotions/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      await fetchPromotions();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleToggleActive = async (p: Promotion) => {
    try {
      const res = await fetch(`/api/admin/promotions/${p.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !p.active }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to toggle");
      }
      await fetchPromotions();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-3 text-gray-500 text-sm">Loading promotions...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Promotions</h1>
      <p className="text-sm text-gray-600 mb-6 max-w-3xl">
        Schedule promotional periods that temporarily lift every plan&apos;s AI generation cap to a flat number.
        Multiple promotions can exist; the active one with the highest flatLimit wins. Use the active toggle as
        a kill switch without changing dates.
      </p>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded-lg mb-4 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-8">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
          {editingSlug ? `Edit "${editingSlug}"` : "New promotion"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block text-gray-700 font-medium mb-1">
              Slug <span className="text-red-500" aria-hidden="true">*</span>
            </span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
              disabled={!!editingSlug}
              required
              pattern="[a-z0-9-]+"
              placeholder="finals-2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-700 font-medium mb-1">
              Name <span className="text-red-500" aria-hidden="true">*</span>
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={120}
              placeholder="Finals Season Boost"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-700 font-medium mb-1">
              Flat limit <span className="text-red-500" aria-hidden="true">*</span>
            </span>
            <input
              type="number"
              min={1}
              value={form.flatLimit}
              onChange={(e) => setForm((f) => ({ ...f, flatLimit: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </label>
          <label className="text-sm flex items-end gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="h-5 w-5 text-blue-600 rounded mb-2.5"
            />
            <span className="text-gray-700 font-medium pb-2">Active (kill switch)</span>
          </label>
          <label className="text-sm">
            <span className="block text-gray-700 font-medium mb-1">
              Starts at (UTC) <span className="text-red-500" aria-hidden="true">*</span>
            </span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-700 font-medium mb-1">
              Ends at (UTC) <span className="text-red-500" aria-hidden="true">*</span>
            </span>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="block text-gray-700 font-medium mb-1">Banner message</span>
            <input
              type="text"
              value={form.bannerMessage}
              onChange={(e) => setForm((f) => ({ ...f, bannerMessage: e.target.value }))}
              maxLength={240}
              placeholder="Finals Season Boost: every plan gets 20 AI sets per 30 days through May 31."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
            <span className="text-xs text-gray-500 mt-1 block">
              No em dashes. No `robust / leverage / comprehensive / seamless / delve`.
            </span>
          </label>
          <label className="text-sm">
            <span className="block text-gray-700 font-medium mb-1">Banner link URL</span>
            <input
              type="text"
              value={form.bannerLink}
              onChange={(e) => setForm((f) => ({ ...f, bannerLink: e.target.value }))}
              maxLength={256}
              placeholder="/pricing"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-700 font-medium mb-1">Banner link label</span>
            <input
              type="text"
              value={form.bannerLinkLabel}
              onChange={(e) => setForm((f) => ({ ...f, bannerLinkLabel: e.target.value }))}
              maxLength={60}
              placeholder="See plans"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="block text-gray-700 font-medium mb-1">Pricing-page callout</span>
            <input
              type="text"
              value={form.pricingCallout}
              onChange={(e) => setForm((f) => ({ ...f, pricingCallout: e.target.value }))}
              maxLength={240}
              placeholder="Plus unlimited CSV imports on every tier. Caps revert June 1."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-700 font-medium mb-1">Pricing-tier badge</span>
            <input
              type="text"
              value={form.pricingTierBadge}
              onChange={(e) => setForm((f) => ({ ...f, pricingTierBadge: e.target.value }))}
              maxLength={60}
              placeholder="20 through May 31"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
            <span className="text-xs text-gray-500 mt-1 block">Shown next to the AI cap line on each tier card.</span>
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving..." : editingSlug ? "Save changes" : "Create promotion"}
            </button>
            {editingSlug && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            )}
            {savedFlash && (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <CheckCircleIcon className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200">
          All promotions
        </h2>
        {promotions.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No promotions yet. Create one above.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {promotions.map((p) => {
              const s = statusOf(p);
              return (
                <li key={p._id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{p.name}</h3>
                      <span className="text-xs font-mono text-gray-500">{p.slug}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[s]}`}>{s}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      flatLimit: {p.flatLimit} &nbsp;·&nbsp;
                      {new Date(p.startsAt).toLocaleString()} &rarr; {new Date(p.endsAt).toLocaleString()}
                    </p>
                    {p.bannerMessage && (
                      <p className="text-xs text-gray-700 mt-2 italic">&ldquo;{p.bannerMessage}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(p)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                      aria-label={`${p.active ? "Disable" : "Enable"} ${p.slug}`}
                    >
                      {p.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => beginEdit(p)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1"
                      aria-label={`Edit ${p.slug}`}
                    >
                      <PencilSquareIcon className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.slug)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 inline-flex items-center gap-1"
                      aria-label={`Delete ${p.slug}`}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
