'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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

    fetchSettings();
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
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
                  className="mt-1 block w-full sm:w-48 pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                />
              </div>
            )}
          </div>
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
              Once you delete your account, all of your data will be permanently removed.
              This action cannot be undone.
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
                  Yes, delete my account
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
