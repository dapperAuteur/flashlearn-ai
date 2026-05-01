'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CreateTeamPage() {
  const { status } = useSession();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
          tags: tagList.length > 0 ? tagList : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to create study group.');
        return;
      }

      router.push(`/team/${data.team?._id || data.teamId}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 -m-4 p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back link */}
        <Link
          href="/team"
          className="inline-flex items-center min-h-[44px] text-sm text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Back to My Study Groups"
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Back to Study Groups
        </Link>

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="h-7 w-7 text-blue-600" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-gray-900">Create Study Group</h1>
          </div>
          <p className="text-sm text-gray-600">
            Set up a new study group to share flashcard sets and study together. Invite up to 3 members by email; share the join code with anyone else.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Group Name */}
            <div>
              <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-1">
                Group Name <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="team-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                placeholder="e.g., Biology Study Group"
                className="w-full min-h-[44px] px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-required="true"
              />
              <p className="mt-1 text-xs text-gray-500">{name.length}/100 characters</p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="team-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="team-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Describe what your study group is about (optional)"
                className="w-full min-h-[44px] px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              />
              <p className="mt-1 text-xs text-gray-500">{description.length}/500 characters</p>
            </div>

            {/* Public Toggle */}
            <div className="flex items-center gap-3">
              <input
                id="team-public"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="team-public" className="text-sm font-medium text-gray-700">
                Make this study group public
              </label>
            </div>
            <p className="text-xs text-gray-500 -mt-3 ml-8">
              Public study groups can be discovered and joined by anyone.
            </p>

            {/* Tags */}
            <div>
              <label htmlFor="team-tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                id="team-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., biology, AP, exam-prep (comma-separated)"
                className="w-full min-h-[44px] px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Separate tags with commas to help others find your study group.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3" role="alert">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                  Creating...
                </>
              ) : (
                'Create Study Group'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
