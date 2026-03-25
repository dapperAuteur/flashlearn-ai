import { ActivityEvent } from '@/models/ActivityEvent';
import dbConnect from '@/lib/db/dbConnect';

type ActivityType = 'study_session' | 'achievement_earned' | 'set_created' | 'set_shared' | 'challenge_completed' | 'team_joined' | 'follow';
type Visibility = 'public' | 'followers' | 'private';

export async function createActivityEvent(
  userId: string,
  type: ActivityType,
  metadata: Record<string, unknown> = {},
  visibility: Visibility = 'public',
) {
  await dbConnect();

  return ActivityEvent.create({
    userId,
    type,
    metadata,
    visibility,
  });
}

export async function getUserActivity(
  userId: string,
  options: { limit?: number; offset?: number; publicOnly?: boolean } = {},
) {
  await dbConnect();

  const { limit = 20, offset = 0, publicOnly = false } = options;

  const filter: Record<string, unknown> = { userId };
  if (publicOnly) {
    filter.visibility = 'public';
  }

  return ActivityEvent.find(filter)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}
