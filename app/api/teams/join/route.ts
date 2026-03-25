import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Team } from '@/models/Team';
import { createActivityEvent } from '@/lib/services/activityService';

// POST - Join a team using a join code
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { joinCode } = await request.json();

    if (!joinCode?.trim()) {
      return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
    }

    await dbConnect();

    const team = await Team.findOne({ joinCode: joinCode.trim().toUpperCase() });
    if (!team) {
      return NextResponse.json({ error: 'Invalid join code' }, { status: 404 });
    }

    // Check if already a member
    const alreadyMember = team.members.some(
      (m: { userId: { toString: () => string } }) => m.userId.toString() === session.user.id,
    );
    if (alreadyMember) {
      return NextResponse.json({ error: 'You are already a member of this team' }, { status: 400 });
    }

    // Check max members
    if (team.members.length >= team.maxMembers) {
      return NextResponse.json({ error: 'This team has reached its maximum member capacity' }, { status: 400 });
    }

    team.members.push({
      userId: session.user.id,
      role: 'member',
      joinedAt: new Date(),
    });

    await team.save();

    await createActivityEvent(session.user.id, 'team_joined', {
      teamId: team._id.toString(),
      teamName: team.name,
      action: 'joined',
    });

    return NextResponse.json({
      team: {
        _id: team._id,
        name: team.name,
        memberCount: team.members.length,
      },
    });
  } catch (error) {
    console.error('Error joining team:', error);
    return NextResponse.json({ error: 'Failed to join team' }, { status: 500 });
  }
}
