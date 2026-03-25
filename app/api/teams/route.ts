import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Team } from '@/models/Team';
import { createActivityEvent } from '@/lib/services/activityService';

// GET - List teams the current user belongs to
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    const teams = await Team.find({ 'members.userId': session.user.id })
      .select('name description avatar isPublic tags members joinCode creatorId createdAt')
      .lean();

    const teamsWithCount = teams.map((team) => ({
      ...team,
      memberCount: team.members.length,
    }));

    return NextResponse.json({ teams: teamsWithCount });
  } catch (error) {
    console.error('Error listing teams:', error);
    return NextResponse.json({ error: 'Failed to list teams' }, { status: 500 });
  }
}

// POST - Create a new team
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, description, avatar, isPublic, tags, maxMembers } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Team name must be at most 100 characters' }, { status: 400 });
    }

    if (description && description.length > 500) {
      return NextResponse.json({ error: 'Description must be at most 500 characters' }, { status: 400 });
    }

    if (tags && (!Array.isArray(tags) || tags.some((t: string) => typeof t !== 'string' || t.length > 30))) {
      return NextResponse.json({ error: 'Tags must be an array of strings (max 30 chars each)' }, { status: 400 });
    }

    await dbConnect();

    const joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const team = await Team.create({
      name: name.trim(),
      description: description?.trim(),
      avatar: avatar || undefined,
      creatorId: session.user.id,
      members: [
        {
          userId: session.user.id,
          role: 'admin',
          joinedAt: new Date(),
        },
      ],
      sharedSets: [],
      joinCode,
      isPublic: isPublic ?? false,
      maxMembers: maxMembers ?? 20,
      tags: tags || [],
    });

    await createActivityEvent(session.user.id, 'team_joined', {
      teamId: team._id.toString(),
      teamName: team.name,
      action: 'created',
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
