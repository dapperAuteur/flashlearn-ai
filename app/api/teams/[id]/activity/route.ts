import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Team } from '@/models/Team';
import { ActivityEvent } from '@/models/ActivityEvent';
import { User } from '@/models/User';

interface Params {
  params: Promise<{ id: string }>;
}

// Activity-feed event types relevant to a study group. Excludes follow events
// (irrelevant to group scope) and team_joined for OTHER teams (but keeps it
// for member additions to this team — handled by metadata filter below).
const RELEVANT_TYPES = [
  'study_session',
  'achievement_earned',
  'set_created',
  'set_shared',
  'challenge_completed',
  'team_joined',
] as const;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const limit = Math.min(
    MAX_LIMIT,
    Number(new URL(request.url).searchParams.get('limit')) || DEFAULT_LIMIT,
  );

  try {
    await dbConnect();

    const team = await Team.findById(id).select('members').lean<{ members: { userId: { toString(): string } }[] }>();
    if (!team) {
      return NextResponse.json({ error: 'Study group not found' }, { status: 404 });
    }

    const memberIds = team.members.map((m) => m.userId.toString());
    const isMember = memberIds.includes(session.user.id);
    if (!isMember && session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch recent activity from team members. Filter team_joined to events
    // for THIS team via metadata so we don't surface "Bob joined a different team."
    const events = await ActivityEvent.find({
      userId: { $in: memberIds },
      type: { $in: RELEVANT_TYPES },
      visibility: { $in: ['public', 'followers'] },
      $or: [
        { type: { $ne: 'team_joined' } },
        { type: 'team_joined', 'metadata.teamId': id },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Hydrate with user names so the client doesn't need a second round-trip.
    const userIds = Array.from(new Set(events.map((e) => e.userId.toString())));
    const users = await User.find({ _id: { $in: userIds } })
      .select('name username profilePicture')
      .lean<{ _id: { toString(): string }; name?: string; username?: string; profilePicture?: string }[]>();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const feed = events.map((e) => {
      const user = userMap.get(e.userId.toString());
      return {
        _id: e._id?.toString() ?? '',
        type: e.type,
        metadata: e.metadata,
        createdAt: e.createdAt,
        userId: e.userId.toString(),
        userName: user?.username || user?.name || 'A member',
        profilePicture: user?.profilePicture || null,
      };
    });

    return NextResponse.json({ feed });
  } catch (error) {
    console.error('Error fetching team activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
