/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Team } from '@/models/Team';

interface Params {
  params: Promise<{ id: string }>;
}

// GET - Get team details with populated member info
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await dbConnect();

    const team = await Team.findById(id)
      .populate('members.userId', 'name username profilePicture')
      .populate('sharedSets')
      .lean();

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify the user is a member of this team
    const doc = team as any;
    const isMember = doc.members.some(
      (m: any) => {
        const uid = m.userId?._id?.toString() ?? m.userId?.toString();
        return uid === session.user.id;
      },
    );

    if (!isMember && session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

// PATCH - Update team details (admin members only)
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { name, description, avatar, isPublic, tags } = await request.json();

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: 'Team name cannot be empty' }, { status: 400 });
    }

    if (name && name.trim().length > 100) {
      return NextResponse.json({ error: 'Team name must be at most 100 characters' }, { status: 400 });
    }

    if (description !== undefined && description !== null && description.length > 500) {
      return NextResponse.json({ error: 'Description must be at most 500 characters' }, { status: 400 });
    }

    if (tags !== undefined && (!Array.isArray(tags) || tags.some((t: string) => typeof t !== 'string' || t.length > 30))) {
      return NextResponse.json({ error: 'Tags must be an array of strings (max 30 chars each)' }, { status: 400 });
    }

    await dbConnect();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check user is an admin member
    const member = team.members.find(
      (m: { userId: { toString: () => string }; role: string }) => m.userId.toString() === session.user.id,
    );

    if (!member || member.role !== 'admin') {
      return NextResponse.json({ error: 'Only team admins can update team settings' }, { status: 403 });
    }

    // Apply updates
    if (name !== undefined) team.name = name.trim();
    if (description !== undefined) team.description = description?.trim() ?? '';
    if (avatar !== undefined) team.avatar = avatar;
    if (isPublic !== undefined) team.isPublic = isPublic;
    if (tags !== undefined) team.tags = tags;

    await team.save();

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

// DELETE - Delete team (creator only)
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await dbConnect();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const isCreator = team.creatorId.toString() === session.user.id;
    const isAdmin = session.user.role === 'Admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Only the team creator can delete this team' }, { status: 403 });
    }

    await Team.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
