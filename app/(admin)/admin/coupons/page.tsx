'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Ticket,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from 'lucide-react';

interface Redemption {
  userId: {
    _id: string;
    name?: string;
    email?: string;
  } | string;
  redeemedAt: string;
  subscriptionTier: string;
}

interface Coupon {
  _id: string;
  stripeCouponId: string;
  stripePromoCodeId: string;
  code: string;
  description?: string;
  discountType: 'percent_off' | 'amount_off';
  discountValue: number;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  maxRedemptions?: number;
  expiresAt?: string;
  isActive: boolean;
  redemptionCount: number;
  redemptions: Redemption[];
  createdAt: string;
}

const DURATION_LABELS: Record<string, string> = {
  once: 'Once',
  repeating: 'Repeating',
  forever: 'Forever',
};

export default function AdminCouponsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percent_off' as 'percent_off' | 'amount_off',
    discountValue: '',
    duration: 'once' as 'once' | 'repeating' | 'forever',
    durationInMonths: '',
    maxRedemptions: '',
    expiresAt: '',
  });

  // Expanded rows for redemption details
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Record<string, Redemption[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const user = session?.user as { role?: string } | undefined;

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/coupons');
      if (!res.ok) throw new Error('Failed to fetch coupons');
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'Admin') {
      fetchCoupons();
    } else if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, user?.role, router, fetchCoupons]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const body: Record<string, unknown> = {
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        duration: formData.duration,
      };

      if (formData.description.trim()) {
        body.description = formData.description.trim();
      }
      if (formData.duration === 'repeating' && formData.durationInMonths) {
        body.durationInMonths = parseInt(formData.durationInMonths, 10);
      }
      if (formData.maxRedemptions) {
        body.maxRedemptions = parseInt(formData.maxRedemptions, 10);
      }
      if (formData.expiresAt) {
        body.expiresAt = formData.expiresAt;
      }

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create coupon');
      }

      setSuccess(`Coupon "${data.coupon.code}" created successfully!`);
      setFormData({
        code: '',
        description: '',
        discountType: 'percent_off',
        discountValue: '',
        duration: 'once',
        durationInMonths: '',
        maxRedemptions: '',
        expiresAt: '',
      });
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (coupon: Coupon) => {
    if (!confirm(`Deactivate coupon "${coupon.code}"? Users will no longer be able to use this code.`)) {
      return;
    }

    setDeactivating(coupon._id);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/coupons/${coupon._id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to deactivate coupon');
      }

      setSuccess(`Coupon "${coupon.code}" deactivated.`);
      fetchCoupons();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeactivating(null);
    }
  };

  const toggleExpanded = async (couponId: string) => {
    const next = new Set(expandedRows);
    if (next.has(couponId)) {
      next.delete(couponId);
      setExpandedRows(next);
      return;
    }

    next.add(couponId);
    setExpandedRows(next);

    // Fetch full details if not already loaded
    if (!expandedDetails[couponId]) {
      setLoadingDetails(couponId);
      try {
        const res = await fetch(`/api/admin/coupons/${couponId}`);
        if (res.ok) {
          const data = await res.json();
          setExpandedDetails((prev) => ({
            ...prev,
            [couponId]: data.coupon.redemptions || [],
          }));
        }
      } catch {
        // Silently fail — redemption details are not critical
      } finally {
        setLoadingDetails(null);
      }
    }
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discountType === 'percent_off') {
      return `${coupon.discountValue}% off`;
    }
    return `$${coupon.discountValue} off`;
  };

  const formatDate = (d?: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (d?: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || (status === 'authenticated' && loading && coupons.length === 0)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupon Manager</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage promo codes for Stripe checkout
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Create Coupon
            </>
          )}
        </button>
      </div>

      {/* Success alert */}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Create Coupon Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Coupon</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promo Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER25"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discountType: 'percent_off' })}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      formData.discountType === 'percent_off'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discountType: 'amount_off' })}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      formData.discountType === 'amount_off'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Fixed Amount ($)
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Value <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {formData.discountType === 'percent_off' ? '%' : '$'}
                  </span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={formData.discountType === 'percent_off' ? 100 : undefined}
                    step={formData.discountType === 'amount_off' ? '0.01' : '1'}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder={formData.discountType === 'percent_off' ? '25' : '10.00'}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: e.target.value as 'once' | 'repeating' | 'forever',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="once">Once</option>
                  <option value="repeating">Repeating</option>
                  <option value="forever">Forever</option>
                </select>
              </div>

              {/* Duration in Months (conditional) */}
              {formData.duration === 'repeating' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration in Months <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.durationInMonths}
                    onChange={(e) => setFormData({ ...formData, durationInMonths: e.target.value })}
                    placeholder="e.g. 3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Max Redemptions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Redemptions <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.maxRedemptions}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Description (full width) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400 text-xs">(optional, internal only)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Internal note about this coupon..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Ticket className="h-4 w-4" />
                    Create Coupon
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons List */}
      {coupons.length === 0 && !loading ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No coupons yet. Create one to get started.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="md:hidden space-y-3">
            {coupons.map((coupon) => (
              <div
                key={coupon._id}
                className={`bg-white rounded-lg shadow border border-gray-100 p-4 ${
                  deactivating === coupon._id ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-sm font-mono">
                      {coupon.code}
                    </p>
                    {coupon.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {coupon.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                      coupon.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {coupon.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-3">
                  <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium">
                    {formatDiscount(coupon)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {DURATION_LABELS[coupon.duration]}
                    {coupon.duration === 'repeating' && coupon.durationInMonths
                      ? ` (${coupon.durationInMonths}mo)`
                      : ''}
                  </span>
                  <span>
                    {coupon.redemptionCount} redeemed
                    {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions} max` : ''}
                  </span>
                </div>

                <div className="text-xs text-gray-400 mt-2">
                  Created {formatDate(coupon.createdAt)}
                  {coupon.expiresAt && ` | Expires ${formatDate(coupon.expiresAt)}`}
                </div>

                <div className="flex gap-2 mt-3">
                  {coupon.redemptionCount > 0 && (
                    <button
                      onClick={() => toggleExpanded(coupon._id)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 inline-flex items-center gap-1"
                    >
                      {expandedRows.has(coupon._id) ? (
                        <>
                          <ChevronUp className="h-3 w-3" /> Hide
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" /> Redemptions
                        </>
                      )}
                    </button>
                  )}
                  {coupon.isActive && (
                    <button
                      onClick={() => handleDeactivate(coupon)}
                      disabled={deactivating === coupon._id}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Deactivate
                    </button>
                  )}
                </div>

                {/* Expanded redemptions (mobile) */}
                {expandedRows.has(coupon._id) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {loadingDetails === coupon._id ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    ) : (expandedDetails[coupon._id] || coupon.redemptions)?.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Redemption History
                        </p>
                        {(expandedDetails[coupon._id] || coupon.redemptions).map((r, i) => {
                          const user = typeof r.userId === 'object' && r.userId !== null ? r.userId : null;
                          return (
                            <div key={i} className="flex justify-between items-center text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded">
                              <span>{user?.email || user?.name || (typeof r.userId === 'string' ? r.userId : 'Unknown')}</span>
                              <span className="text-gray-400">
                                {r.subscriptionTier} - {formatDateTime(r.redeemedAt)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No redemption details available.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Code
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Description
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Discount
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Duration
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Redeemed
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Created
                  </th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((coupon) => (
                  <>
                    <tr
                      key={coupon._id}
                      className={`hover:bg-gray-50 ${
                        deactivating === coupon._id ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-gray-900 font-mono">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500 max-w-[200px] truncate block">
                          {coupon.description || '--'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full">
                          {formatDiscount(coupon)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-700">
                          {DURATION_LABELS[coupon.duration]}
                          {coupon.duration === 'repeating' && coupon.durationInMonths
                            ? ` (${coupon.durationInMonths}mo)`
                            : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        {coupon.redemptionCount}
                        {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(coupon.createdAt)}
                        {coupon.expiresAt && (
                          <span className="block text-xs text-gray-400">
                            Exp: {formatDate(coupon.expiresAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                            coupon.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {coupon.redemptionCount > 0 && (
                            <button
                              onClick={() => toggleExpanded(coupon._id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="View redemptions"
                            >
                              {expandedRows.has(coupon._id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {coupon.isActive && (
                            <button
                              onClick={() => handleDeactivate(coupon)}
                              disabled={deactivating === coupon._id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Deactivate coupon"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded redemption details row */}
                    {expandedRows.has(coupon._id) && (
                      <tr key={`${coupon._id}-details`}>
                        <td colSpan={8} className="px-4 py-3 bg-gray-50">
                          {loadingDetails === coupon._id ? (
                            <div className="flex items-center justify-center py-3">
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            </div>
                          ) : (expandedDetails[coupon._id] || coupon.redemptions)?.length > 0 ? (
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                Redemption History
                              </p>
                              <div className="space-y-1">
                                {(expandedDetails[coupon._id] || coupon.redemptions).map((r, i) => {
                                  const rUser = typeof r.userId === 'object' && r.userId !== null ? r.userId : null;
                                  return (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between text-xs text-gray-600 bg-white px-3 py-2 rounded border border-gray-100"
                                    >
                                      <span className="font-medium">
                                        {rUser?.email || rUser?.name || (typeof r.userId === 'string' ? r.userId : 'Unknown')}
                                      </span>
                                      <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                                          {r.subscriptionTier}
                                        </span>
                                        <span className="text-gray-400">
                                          {formatDateTime(r.redeemedAt)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 text-center py-2">
                              No redemption details available.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
