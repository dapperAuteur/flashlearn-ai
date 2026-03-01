'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getSubscriptionDisplay } from '@/lib/utils/subscription';
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';
import { Camera, X } from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  username?: string;
  profilePicture?: string;
  role: string;
  subscriptionTier: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile picture
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [pictureMessage, setPictureMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change email
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check for email change success from redirect
  useEffect(() => {
    if (searchParams.get('emailChanged') === 'true') {
      setProfileMessage({ type: 'success', text: 'Your email address has been updated successfully.' });
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setName(data.user.name || '');
          setUsername(data.user.username || '');
        }
      } catch {
        // Silently fail — session data used as fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [status, router]);

  const checkUsernameAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    // Don't check if it's the same as current username
    if (value === user?.username) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const res = await fetch(`/api/user/check-username?username=${encodeURIComponent(value)}`);
      const data = await res.json();
      setUsernameAvailable(data.available);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);

    try {
      const body: Record<string, string> = { name: name.trim() };
      if (username.trim()) {
        body.username = username.trim().toLowerCase();
      }

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        setProfileMessage({ type: 'success', text: data.message });
        setUser(data.user);
        await updateSession();
      } else {
        setProfileMessage({ type: 'error', text: data.error });
      }
    } catch {
      setProfileMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate client-side
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPictureMessage({ type: 'error', text: 'Please select a JPEG, PNG, GIF, or WebP image.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPictureMessage({ type: 'error', text: 'Image must be under 5MB.' });
      return;
    }

    setUploadingPicture(true);
    setPictureMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setUser((prev) => prev ? { ...prev, profilePicture: data.url } : prev);
        setPictureMessage({ type: 'success', text: 'Profile picture updated!' });
        await updateSession();
      } else {
        setPictureMessage({ type: 'error', text: data.error || 'Failed to upload picture' });
      }
    } catch {
      setPictureMessage({ type: 'error', text: 'Failed to upload picture' });
    } finally {
      setUploadingPicture(false);
      // Clear the file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePictureRemove = async () => {
    setUploadingPicture(true);
    setPictureMessage(null);

    try {
      const res = await fetch('/api/user/profile-picture', { method: 'DELETE' });

      if (res.ok) {
        setUser((prev) => prev ? { ...prev, profilePicture: undefined } : prev);
        setPictureMessage({ type: 'success', text: 'Profile picture removed.' });
        await updateSession();
      } else {
        const data = await res.json();
        setPictureMessage({ type: 'error', text: data.error || 'Failed to remove picture' });
      }
    } catch {
      setPictureMessage({ type: 'error', text: 'Failed to remove picture' });
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingEmail(true);
    setEmailMessage(null);

    try {
      const res = await fetch('/api/user/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: newEmail.trim(), password: emailPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setEmailMessage({ type: 'success', text: 'Verification email sent to your new address. Please check your inbox.' });
        setNewEmail('');
        setEmailPassword('');
        setShowChangeEmail(false);
      } else {
        setEmailMessage({ type: 'error', text: data.error || 'Failed to initiate email change' });
      }
    } catch {
      setEmailMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setChangingEmail(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 12) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 12 characters' });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setPasswordMessage({ type: 'success', text: data.message });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: data.error });
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Failed to update password' });
    } finally {
      setIsUpdatingPassword(false);
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

  const displayUser = user || session?.user;
  if (!displayUser) return null;

  const displayRole = user?.role || session?.user?.role;
  const displayTier = user?.subscriptionTier || session?.user?.subscriptionTier;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p className="mt-1 text-gray-600">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Account Information */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center">
            {/* Profile Picture */}
            <div className="relative group">
              {user?.profilePicture ? (
                <Image
                  src={user.profilePicture}
                  alt="Profile"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-semibold">
                  {(user?.name || session?.user?.name)?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPicture}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-5 w-5 text-white" />
              </button>
              {user?.profilePicture && (
                <button
                  type="button"
                  onClick={handlePictureRemove}
                  disabled={uploadingPicture}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove picture"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handlePictureUpload}
                className="hidden"
              />
            </div>
            <div className="ml-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Account Information
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Personal details and preferences.
              </p>
              {uploadingPicture && (
                <p className="text-xs text-blue-600">Uploading...</p>
              )}
            </div>
          </div>
          {pictureMessage && (
            <div className={`mt-3 text-sm px-3 py-2 rounded-md ${
              pictureMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {pictureMessage.text}
            </div>
          )}
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Full name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user?.name || session?.user?.name}
              </dd>
            </div>
            {user?.username && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  @{user.username}
                </dd>
              </div>
            )}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Email address</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user?.email || session?.user?.email}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Subscription plan</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {getSubscriptionDisplay(displayRole, displayTier)}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Member since</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '\u2014'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Update Profile Form */}
      <div className="mt-6 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Update Profile
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Change your profile information.</p>
          </div>
          <form onSubmit={handleProfileUpdate} className="mt-5 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md text-gray-900 px-3 py-2"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                name="username"
                id="username"
                value={username}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase();
                  setUsername(val);
                  checkUsernameAvailability(val);
                }}
                className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md text-gray-900 px-3 py-2"
                placeholder="cool_learner"
                minLength={3}
                maxLength={20}
              />
              {checkingUsername && (
                <p className="mt-1 text-xs text-gray-500">Checking availability...</p>
              )}
              {!checkingUsername && usernameAvailable === true && (
                <p className="mt-1 text-xs text-green-600">Username is available</p>
              )}
              {!checkingUsername && usernameAvailable === false && (
                <p className="mt-1 text-xs text-red-600">Username is already taken</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Used on leaderboards. Lowercase letters, numbers, underscores, and hyphens only.</p>
            </div>

            <div>
              <label htmlFor="email-display" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="email"
                  id="email-display"
                  value={user?.email || session?.user?.email || ''}
                  className="shadow-sm block w-full sm:text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-600 px-3 py-2"
                  disabled
                />
                <button
                  type="button"
                  onClick={() => setShowChangeEmail(!showChangeEmail)}
                  className="text-sm text-blue-600 hover:text-blue-500 whitespace-nowrap"
                >
                  Change
                </button>
              </div>
            </div>

            {showChangeEmail && (
              <div className="border border-gray-200 rounded-md p-4 space-y-3 bg-gray-50">
                <div>
                  <label htmlFor="new-email" className="block text-sm font-medium text-gray-700">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    id="new-email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md text-gray-900 px-3 py-2"
                    placeholder="new@example.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email-confirm-password" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="email-confirm-password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md text-gray-900 px-3 py-2"
                    placeholder="Enter your current password"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    disabled={changingEmail || !newEmail || !emailPassword}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingEmail ? 'Sending...' : 'Send Verification'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowChangeEmail(false); setNewEmail(''); setEmailPassword(''); }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {emailMessage && (
              <div className={`text-sm px-3 py-2 rounded-md ${
                emailMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {emailMessage.text}
              </div>
            )}

            {profileMessage && (
              <div className={`text-sm px-3 py-2 rounded-md ${
                profileMessage.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {profileMessage.text}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="mt-6 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Change Password
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Update your password to maintain account security.</p>
          </div>
          <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md text-gray-900 px-3 py-2"
                required
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md text-gray-900 px-3 py-2"
                minLength={12}
                required
              />
              <PasswordStrengthMeter password={newPassword} />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md text-gray-900 px-3 py-2"
                minLength={12}
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            {passwordMessage && (
              <div className={`text-sm px-3 py-2 rounded-md ${
                passwordMessage.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {passwordMessage.text}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
