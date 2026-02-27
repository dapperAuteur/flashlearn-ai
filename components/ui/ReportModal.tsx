'use client';

import { useState } from 'react';
import { XMarkIcon, FlagIcon } from '@heroicons/react/24/outline';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: string;
  setTitle: string;
}

const REASONS = [
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'offensive', label: 'Offensive or hateful' },
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'other', label: 'Other' },
] as const;

export default function ReportModal({ isOpen, onClose, setId, setTitle }: ReportModalProps) {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Please select a reason for reporting.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sets/${setId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, description: description.trim() || undefined }),
      });

      if (res.status === 409) {
        setError('You have already reported this set.');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit report.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReason('');
        setDescription('');
        onClose();
      }, 2000);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FlagIcon className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">Report Set</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Report Submitted</h3>
            <p className="text-sm text-gray-600">Thank you for helping keep FlashLearn safe.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-sm text-gray-600">
              Reporting: <span className="font-medium text-gray-900">{setTitle}</span>
            </p>

            {/* Reason selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reporting <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      reason === r.value
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional details <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Provide more context about why you are reporting this set..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-red-500 focus:border-red-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{description.length}/500 characters</p>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reason}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
