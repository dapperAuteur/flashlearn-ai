'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Trophy, Swords, Users, UserPlus, Share2, GraduationCap } from 'lucide-react';

interface ActivityEventItem {
  _id: string;
  type: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const eventConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  study_session: { icon: BookOpen, color: 'bg-blue-100 text-blue-600', label: 'Completed a study session' },
  achievement_earned: { icon: Trophy, color: 'bg-yellow-100 text-yellow-600', label: 'Earned an achievement' },
  set_created: { icon: GraduationCap, color: 'bg-green-100 text-green-600', label: 'Created a flashcard set' },
  set_shared: { icon: Share2, color: 'bg-purple-100 text-purple-600', label: 'Shared a flashcard set' },
  challenge_completed: { icon: Swords, color: 'bg-orange-100 text-orange-600', label: 'Completed a challenge' },
  team_joined: { icon: Users, color: 'bg-teal-100 text-teal-600', label: 'Joined a team' },
  follow: { icon: UserPlus, color: 'bg-pink-100 text-pink-600', label: 'Followed a user' },
};

function getEventDescription(event: ActivityEventItem): string {
  const meta = event.metadata;
  switch (event.type) {
    case 'study_session':
      return meta.setName ? `Studied "${meta.setName}" — ${meta.accuracy || 0}% accuracy` : 'Completed a study session';
    case 'achievement_earned':
      return meta.title ? `Earned "${meta.title}"` : 'Earned an achievement';
    case 'set_created':
      return meta.setName ? `Created "${meta.setName}"` : 'Created a new flashcard set';
    case 'challenge_completed':
      return meta.setName ? `Completed a challenge on "${meta.setName}"` : 'Completed a versus challenge';
    case 'team_joined':
      return meta.teamName ? `Joined team "${meta.teamName}"` : 'Joined a team';
    case 'follow':
      return meta.targetUserName ? `Started following ${meta.targetUserName}` : 'Followed a user';
    default:
      return eventConfig[event.type]?.label || 'Activity';
  }
}

interface ActivityFeedProps {
  username: string;
}

export default function ActivityFeed({ username }: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`/api/users/${username}/activity?limit=10`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, [username]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/3 mt-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">No recent activity</p>
    );
  }

  return (
    <div className="space-y-1" role="feed" aria-label="Recent activity">
      {events.map(event => {
        const config = eventConfig[event.type] || eventConfig.study_session;
        const Icon = config.icon;
        const timeAgo = getTimeAgo(event.createdAt);

        return (
          <article key={event._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{getEventDescription(event)}</p>
              <time className="text-xs text-gray-500" dateTime={event.createdAt}>{timeAgo}</time>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
