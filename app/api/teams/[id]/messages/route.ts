/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Team } from '@/models/Team';
import { TeamMessage } from '@/models/TeamMessage';

interface Params {
  params: Promise<{ id: string }>;
}

// GET - Get paginated messages for a team
export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

  try {
    await dbConnect();

    const team = await Team.findById(id).select('members').lean() as any;
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify the user is a member
    const isMember = team.members.some(
      (m: any) => m.userId.toString() === session.user.id,
    );

    if (!isMember && session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const [messages, total] = await Promise.all([
      TeamMessage.find({ teamId: id })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('senderId', 'name username profilePicture')
        .lean(),
      TeamMessage.countDocuments({ teamId: id }),
    ]);

    return NextResponse.json({ messages, total, limit, offset });
  } catch (error) {
    console.error('Error fetching team messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST - Send a message to the team
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Message must be at most 2000 characters' }, { status: 400 });
    }

    await dbConnect();

    const team = await Team.findById(id).select('members').lean() as any;
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify the user is a member
    const isMember = team.members.some(
      (m: any) => m.userId.toString() === session.user.id,
    );

    if (!isMember) {
      return NextResponse.json({ error: 'Only team members can send messages' }, { status: 403 });
    }

    const message = await TeamMessage.create({
      teamId: id,
      senderId: session.user.id,
      content: content.trim(),
      type: 'message',
    });

    const populated = await TeamMessage.findById(message._id)
      .populate('senderId', 'name username profilePicture')
      .lean();

    return NextResponse.json({ message: populated }, { status: 201 });
  } catch (error) {
    console.error('Error sending team message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
