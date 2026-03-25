import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Team } from '@/models/Team';
import { User } from '@/models/User';

interface Params {
  params: Promise<{ id: string }>;
}

// POST - Add a member to the team (admin only)
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await dbConnect();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check that the requester is an admin member
    const requester = team.members.find(
      (m: { userId: { toString: () => string }; role: string }) => m.userId.toString() === session.user.id,
    );

    if (!requester || requester.role !== 'admin') {
      return NextResponse.json({ error: 'Only team admins can add members' }, { status: 403 });
    }

    // Check if user exists
    const userToAdd = await User.findById(userId).select('_id').lean();
    if (!userToAdd) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already a member
    const alreadyMember = team.members.some(
      (m: { userId: { toString: () => string } }) => m.userId.toString() === userId,
    );
    if (alreadyMember) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
    }

    // Check max members
    if (team.members.length >= team.maxMembers) {
      return NextResponse.json({ error: 'Team has reached maximum member capacity' }, { status: 400 });
    }

    team.members.push({
      userId,
      role: 'member',
      joinedAt: new Date(),
    });

    await team.save();

    return NextResponse.json({ success: true, memberCount: team.members.length });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
  }
}

// DELETE - Remove a member from the team
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await dbConnect();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const requester = team.members.find(
      (m: { userId: { toString: () => string }; role: string }) => m.userId.toString() === session.user.id,
    );

    if (!requester) {
      return NextResponse.json({ error: 'You are not a member of this team' }, { status: 403 });
    }

    const isRemovingSelf = userId === session.user.id;
    const isAdmin = requester.role === 'admin';

    // Non-admins can only remove themselves
    if (!isAdmin && !isRemovingSelf) {
      return NextResponse.json({ error: 'Only admins can remove other members' }, { status: 403 });
    }

    // Prevent removing the creator
    if (userId === team.creatorId.toString()) {
      return NextResponse.json({ error: 'Cannot remove the team creator' }, { status: 400 });
    }

    const memberIndex = team.members.findIndex(
      (m: { userId: { toString: () => string } }) => m.userId.toString() === userId,
    );

    if (memberIndex === -1) {
      return NextResponse.json({ error: 'User is not a member of this team' }, { status: 404 });
    }

    team.members.splice(memberIndex, 1);
    await team.save();

    return NextResponse.json({ success: true, memberCount: team.members.length });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}

// PATCH - Change a member's role (admin only)
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { userId, role } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const validRoles = ['admin', 'member', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: `role must be one of: ${validRoles.join(', ')}` }, { status: 400 });
    }

    await dbConnect();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check that the requester is an admin
    const requester = team.members.find(
      (m: { userId: { toString: () => string }; role: string }) => m.userId.toString() === session.user.id,
    );

    if (!requester || requester.role !== 'admin') {
      return NextResponse.json({ error: 'Only team admins can change member roles' }, { status: 403 });
    }

    // Find the target member
    const targetMember = team.members.find(
      (m: { userId: { toString: () => string } }) => m.userId.toString() === userId,
    );

    if (!targetMember) {
      return NextResponse.json({ error: 'User is not a member of this team' }, { status: 404 });
    }

    // Prevent changing creator's role
    if (userId === team.creatorId.toString()) {
      return NextResponse.json({ error: 'Cannot change the team creator\'s role' }, { status: 400 });
    }

    targetMember.role = role;
    await team.save();

    return NextResponse.json({ success: true, userId, role });
  } catch (error) {
    console.error('Error changing member role:', error);
    return NextResponse.json({ error: 'Failed to change member role' }, { status: 500 });
  }
}
