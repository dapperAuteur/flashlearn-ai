'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

const SEGMENTS = [
  { value: 'all', label: 'All Users' },
  { value: 'free-tier', label: 'Free Tier' },
  { value: 'paid', label: 'Paid Users' },
  { value: 'inactive-7d', label: 'Inactive 7 Days' },
  { value: 'inactive-30d', label: 'Inactive 30 Days' },
  { value: 'no-sets', label: 'No Flashcard Sets' },
  { value: 'no-study', label: 'No Study Sessions' },
];

export default function AdminCampaignNewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [segment, setSegment] = useState('all');
  const [htmlContent, setHtmlContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(editId);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  const user = session?.user as { role?: string } | undefined;

  const loadCampaign = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`);
      if (!res.ok) throw new Error('Failed to load campaign');
      const data = await res.json();
      const c = data.campaign;
      setName(c.name);
      setSubject(c.subject);
      setSegment(c.segment);
      setHtmlContent(c.htmlContent);
      setCampaignId(c._id);
    } catch {
      setError('Failed to load campaign for editing');
    } finally {
      setLoadingEdit(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && user?.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [status, user?.role, router]);

  useEffect(() => {
    if (editId && status === 'authenticated' && user?.role === 'Admin') {
      loadCampaign(editId);
    }
  }, [editId, status, user?.role, loadCampaign]);

  const handleSaveDraft = async () => {
    if (!name.trim() || !subject.trim() || !htmlContent.trim() || !segment) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const body = { name, subject, htmlContent, segment };

      let res: Response;
      if (campaignId) {
        res = await fetch(`/api/admin/campaigns/${campaignId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/admin/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save campaign');
      }

      const data = await res.json();
      if (!campaignId && data.campaign?._id) {
        setCampaignId(data.campaign._id);
      }

      router.push('/admin/campaigns');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!campaignId) {
      // Save draft first to get an ID for preview
      if (!name.trim() || !subject.trim() || !htmlContent.trim() || !segment) {
        setError('Save the campaign first to preview');
        return;
      }

      setSaving(true);
      setError('');
      try {
        const res = await fetch('/api/admin/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, subject, htmlContent, segment }),
        });
        if (!res.ok) throw new Error('Failed to save campaign');
        const data = await res.json();
        setCampaignId(data.campaign._id);
        await fetchPreview(data.campaign._id);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // If already saved, update then preview
    try {
      if (campaignId) {
        await fetch(`/api/admin/campaigns/${campaignId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, subject, htmlContent, segment }),
        });
      }
      await fetchPreview(campaignId);
    } catch {
      setError('Failed to load preview');
    }
  };

  const fetchPreview = async (id: string) => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/preview`);
      if (!res.ok) throw new Error('Failed to load preview');
      const html = await res.text();
      setPreviewHtml(html);
      setShowPreview(true);
    } catch {
      setError('Failed to load preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSend = async () => {
    if (!campaignId) {
      setError('Save the campaign first before sending');
      return;
    }

    setSending(true);
    setError('');
    try {
      // Save latest changes first
      await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, htmlContent, segment }),
      });

      const res = await fetch(`/api/admin/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send campaign');
      }

      const data = await res.json();
      alert(`Campaign is being sent to ${data.recipientCount} recipients.`);
      router.push('/admin/campaigns');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
      setShowSendConfirm(false);
    }
  };

  if (status === 'loading' || loadingEdit) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/campaigns"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {editId ? 'Edit Campaign' : 'New Campaign'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {editId
              ? 'Update your email campaign'
              : 'Create a new email campaign to send to your users'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. February Newsletter"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. New features are here!"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Segment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Segment
          </label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* HTML Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HTML Content
          </label>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            rows={16}
            placeholder="<h2>Hello!</h2><p>Your email content here...</p>"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Write raw HTML. It will be wrapped in the FlashLearn AI branded email template.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handlePreview}
            disabled={saving || loadingPreview}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {loadingPreview ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Preview
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </button>
          <button
            onClick={() => {
              if (!name.trim() || !subject.trim() || !htmlContent.trim()) {
                setError('All fields are required');
                return;
              }
              setShowSendConfirm(true);
            }}
            disabled={sending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Now
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Email Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={previewHtml}
                title="Campaign Preview"
                className="w-full h-full min-h-[500px] border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Send Confirmation Dialog */}
      {showSendConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Send
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              Are you sure you want to send this campaign?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              <strong>Segment:</strong>{' '}
              {SEGMENTS.find((s) => s.value === segment)?.label || segment}
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">
              This action cannot be undone. Emails will begin sending immediately.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSendConfirm(false)}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? 'Sending...' : 'Send Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
