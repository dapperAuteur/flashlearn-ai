import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { Challenge } from '@/models/Challenge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid challenge ID' }, { status: 400 });
  }

  const challenge = await Challenge.findById(id).lean();
  if (!challenge) {
    return NextResponse.json({ message: 'Challenge not found' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ch = challenge as any;

  // For non-public challenges, require auth and participant membership
  if (ch.scope !== 'public') {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const isParticipant = ch.participants?.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.userId.toString() === session.user.id,
    );
    if (!isParticipant) {
      return NextResponse.json({ message: 'Access restricted to challenge participants' }, { status: 403 });
    }
  }

  // Determine current user (optional — may be unauthenticated for public challenges)
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id || null;

  // Return sanitized participant list (omit sessionId for privacy)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participants = (ch.participants || []).map((p: any) => ({
    userId: p.userId.toString(),
    userName: p.userName,
    status: p.status,
    compositeScore: p.compositeScore ?? null,
    scoreBreakdown: p.scoreBreakdown ?? null,
    rank: p.rank ?? null,
    completedAt: p.completedAt ?? null,
  }));

  return NextResponse.json({
    challenge: {
      _id: ch._id.toString(),
      challengeCode: ch.challengeCode,
      setName: ch.setName,
      flashcardSetId: ch.flashcardSetId.toString(),
      studyMode: ch.studyMode,
      studyDirection: ch.studyDirection,
      cardCount: ch.cardCount,
      scope: ch.scope,
      status: ch.status,
      expiresAt: ch.expiresAt,
      maxParticipants: ch.maxParticipants,
      createdAt: ch.createdAt,
    },
    participants,
    currentUserId,
  });
}
