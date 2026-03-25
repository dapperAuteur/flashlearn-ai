'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { UserPlus, UserCheck } from 'lucide-react';

interface FollowButtonProps {
  targetUserId: string;
  initialFollowing?: boolean;
}

export default function FollowButton({ targetUserId, initialFollowing = false }: FollowButtonProps) {
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);

  if (!session?.user?.id || session.user.id === targetUserId) {
    return null;
  }

  const handleToggle = async () => {
    setIsLoading(true);
    const prev = isFollowing;
    setIsFollowing(!prev); // Optimistic

    try {
      const res = await fetch('/api/follows', {
        method: prev ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId }),
      });

      if (!res.ok) {
        setIsFollowing(prev); // Revert
      }
    } catch {
      setIsFollowing(prev); // Revert
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm font-medium rounded-lg transition-colors ${
        isFollowing
          ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } disabled:opacity-50`}
      aria-label={isFollowing ? `Unfollow user` : `Follow user`}
    >
      {isFollowing ? (
        <>
          <UserCheck className="h-4 w-4" aria-hidden="true" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Follow
        </>
      )}
    </button>
  );
}
