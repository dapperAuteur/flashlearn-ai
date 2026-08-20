'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type OutboxStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Preferences {
  defaultStudyDirection: string;
  defaultStudyMode: string;
  studyReminderEnabled: boolean;
  studyReminderTime: string;
}

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [preferences, setPreferences] = useState<Preferences>({
    defaultStudyDirection: 'front-to-back',
    defaultStudyMode: 'classic',
    studyReminderEnabled: false,
    studyReminderTime: '09:00',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // null while the account's stored answer is still on its way. The switch is
  // not rendered until it is known, so it never shows "off" to someone who is
  // opted in.
  const [outboxOptIn, setOutboxOptIn] = useState<boolean | null>(null);
  const [outboxStatus, setOutboxStatus] = useState<OutboxStatus>('idle');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/user/settings');
        if (res.ok) {
          const data = await res.json();
          setPreferences(data.preferences);
        }
      } catch {
        // Use defaults
      } finally {
        setIsLoading(false);
      }
    };

    // The Outbox consent lives on the user record, not in study preferences,
    // so it is a second read. Read it rather than assume it: an account that
    // already opted in has to see the switch on.
    const fetchOutboxOptIn = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setOutboxOptIn(data?.user?.shareToOutboxOptIn === true);
        }
      } catch {
        // Leave it unknown. An unanswered switch is better than a wrong one.
      }
    };

    fetchSettings();
    fetchOutboxOptIn();
  }, [status, router]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        if (data.preferences) setPreferences(data.preferences);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOutboxToggle = async () => {
    if (outboxOptIn === null) return;

    const next = !outboxOptIn;
    setOutboxOptIn(next);
    setOutboxStatus('saving');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToOutboxOptIn: next }),
      });

      if (res.ok) {
        const data = await res.json();
        setOutboxOptIn(data?.user?.shareToOutboxOptIn === true);
        setOutboxStatus('saved');
      } else {
        setOutboxOptIn(!next);
        setOutboxStatus('error');
      }
    } catch {
      setOutboxOptIn(!next);
      setOutboxStatus('error');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/api/user/profile', { method: 'DELETE' });
      if (res.ok) {
        await signOut({ callbackUrl: '/' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete account' });
        setShowDeleteConfirm(false);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete account' });
      setShowDeleteConfirm(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-600">
          Manage your study preferences and account settings.
        </p>
      </div>

      {/* Study Preferences */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Study Preferences
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Customize your default study experience.
          </p>

          <div className="mt-6 space-y-6">
            {/* Default Study Direction */}
            <div>
              <label htmlFor="study-direction" className="block text-sm font-medium text-gray-700">
                Default Study Direction
              </label>
              <select
                id="study-direction"
                value={preferences.defaultStudyDirection}
                onChange={(e) => setPreferences({ ...preferences, defaultStudyDirection: e.target.value })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-900 bg-white"
              >
                <option value="front-to-back">Front to Back</option>
                <option value="back-to-front">Back to Front</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose which side of the flashcard to show first during study sessions.
              </p>
            </div>

            {/* Default Study Mode */}
            <div>
              <label htmlFor="study-mode" className="block text-sm font-medium text-gray-700">
                Default Study Mode
              </label>
              <select
                id="study-mode"
                value={preferences.defaultStudyMode}
                onChange={(e) => setPreferences({ ...preferences, defaultStudyMode: e.target.value })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-900 bg-white"
              >
                <option value="classic">Classic (Flip card)</option>
                <option value="multiple-choice">Multiple Choice</option>
                <option value="type-answer">Type Answer</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose your preferred study mode for new sessions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="mt-6 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Notifications
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure study reminders to stay on track.
          </p>

          <div className="mt-6 space-y-6">
            {/* Study Reminder Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="reminder-toggle" className="text-sm font-medium text-gray-700">
                  Daily Study Reminder
                </label>
                <p className="text-xs text-gray-500">
                  Receive a daily email reminder to study.
                </p>
              </div>
              <button
                id="reminder-toggle"
                type="button"
                role="switch"
                aria-checked={preferences.studyReminderEnabled}
                onClick={() =>
                  setPreferences({
                    ...preferences,
                    studyReminderEnabled: !preferences.studyReminderEnabled,
                  })
                }
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  preferences.studyReminderEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    preferences.studyReminderEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Reminder Time */}
            {preferences.studyReminderEnabled && (
              <div>
                <label htmlFor="reminder-time" className="block text-sm font-medium text-gray-700">
                  Reminder Time
                </label>
                <input
                  type="time"
                  id="reminder-time"
                  value={preferences.studyReminderTime}
                  onChange={(e) =>
                    setPreferences({ ...preferences, studyReminderTime: e.target.value })
                  }
                  className="mt-1 block w-full sm:w-48 pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-900 bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sharing */}
      <div className="mt-6 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Sharing your milestones
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Off by default. Nothing is shared unless you turn this on.
          </p>

          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <span id="outbox-optin-label" className="block text-sm font-medium text-gray-700">
                Turn my study milestones into draft social posts
              </span>
              <p id="outbox-optin-help" className="mt-1 text-xs text-gray-600">
                When you hit a milestone, such as a study streak or a set you made public,
                FlashLearn AI writes a draft social post about it. A person on our team reads
                every draft and decides whether to post it, edit it, or bin it. Nothing is
                published automatically. Turning this off stops new drafts from being written.
              </p>
            </div>

            {outboxOptIn === null ? (
              <span className="text-xs text-gray-600 flex-shrink-0 pt-1">Loading...</span>
            ) : (
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <button
                  id="outbox-optin"
                  type="button"
                  role="switch"
                  aria-checked={outboxOptIn}
                  aria-labelledby="outbox-optin-label"
                  aria-describedby="outbox-optin-help outbox-optin-status"
                  onClick={handleOutboxToggle}
                  disabled={outboxStatus === 'saving'}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                    outboxOptIn ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      outboxOptIn ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                {/* The word, not just the colour, says which way the switch is set. */}
                <span aria-hidden="true" className="text-xs font-medium text-gray-700">
                  {outboxOptIn ? 'On' : 'Off'}
                </span>
              </div>
            )}
          </div>

          <p
            id="outbox-optin-status"
            role="status"
            aria-live="polite"
            className={`mt-3 text-xs min-h-[1rem] ${
              outboxStatus === 'error' ? 'text-red-700' : 'text-gray-600'
            }`}
          >
            {outboxStatus === 'saving' && 'Saving your choice...'}
            {outboxStatus === 'saved' &&
              (outboxOptIn
                ? 'Saved. Your milestones can now be drafted as posts for review.'
                : 'Saved. No new drafts will be written from your milestones.')}
            {outboxStatus === 'error' && 'That did not save. Your setting is unchanged. Try again.'}
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6">
        {message && (
          <div
            className={`mb-4 text-sm px-3 py-2 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="mt-10 bg-white shadow sm:rounded-lg border border-red-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-red-900">
            Danger Zone
          </h3>
          <div className="mt-2 text-sm text-gray-500">
            <p>
              Deleting your account signs you out and hides your public sets right away.
              Your data is then held for 30 days before it is erased for good.
            </p>
            <p className="mt-2">
              Changed your mind? Sign back in any time in those 30 days and your account
              and your public sets come back exactly as they were. After 30 days the
              erasure is permanent and cannot be undone.
            </p>
          </div>
          <div className="mt-5">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Account
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-red-600 font-medium">Are you sure?</span>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Yes, schedule my account for deletion
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
