/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Team } from '@/models/Team';
import { FlashcardSet } from '@/models/FlashcardSet';

interface Params {
  params: Promise<{ id: string }>;
}

// GET - List shared sets for a team
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await dbConnect();

    const team = await Team.findById(id)
      .populate({
        path: 'sharedSets',
        model: FlashcardSet,
        select: 'title description cardCount category creatorId createdAt',
      })
      .lean() as any;

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

    return NextResponse.json({ sets: team.sharedSets });
  } catch (error) {
    console.error('Error fetching team sets:', error);
    return NextResponse.json({ error: 'Failed to fetch team sets' }, { status: 500 });
  }
}

// POST - Share a set to the team
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { setId } = await request.json();

    if (!setId) {
      return NextResponse.json({ error: 'setId is required' }, { status: 400 });
    }

    await dbConnect();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify the user is a member
    const isMember = team.members.some(
      (m: { userId: { toString: () => string } }) => m.userId.toString() === session.user.id,
    );

    if (!isMember) {
      return NextResponse.json({ error: 'Only team members can share sets' }, { status: 403 });
    }

    // Verify the set exists
    const set = await FlashcardSet.findById(setId).select('_id').lean();
    if (!set) {
      return NextResponse.json({ error: 'Flashcard set not found' }, { status: 404 });
    }

    // Check if already shared
    const alreadyShared = team.sharedSets.some(
      (s: { toString: () => string }) => s.toString() === setId,
    );
    if (alreadyShared) {
      return NextResponse.json({ error: 'This set is already shared with the team' }, { status: 400 });
    }

    team.sharedSets.push(setId);
    await team.save();

    return NextResponse.json({ success: true, sharedSetsCount: team.sharedSets.length });
  } catch (error) {
    console.error('Error sharing set to team:', error);
    return NextResponse.json({ error: 'Failed to share set to team' }, { status: 500 });
  }
}
