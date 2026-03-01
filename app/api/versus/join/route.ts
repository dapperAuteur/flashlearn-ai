import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { Challenge } from '@/models/Challenge';
import { User } from '@/models/User';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  const rateLimiter = getRateLimiter('versus-join', 20, 3600);
  const { success } = await rateLimiter.limit(session.user.id);
  if (!success) {
    return NextResponse.json({ message: 'Too many join attempts. Try again later.' }, { status: 429 });
  }

  await dbConnect();
  const userId = new mongoose.Types.ObjectId(session.user.id);
  const { challengeCode } = await request.json();

  if (!challengeCode) {
    return NextResponse.json({ message: 'Challenge code is required' }, { status: 400 });
  }

  const challenge = await Challenge.findOne({
    challengeCode: challengeCode.toUpperCase().trim(),
  });

  if (!challenge) {
    return NextResponse.json({ message: 'Challenge not found. Check the code and try again.' }, { status: 404 });
  }

  // Check expiry
  if (new Date() > challenge.expiresAt) {
    challenge.status = 'expired';
    await challenge.save();
    return NextResponse.json({ message: 'This challenge has expired' }, { status: 400 });
  }

  if (challenge.status === 'completed') {
    return NextResponse.json({ message: 'This challenge is already completed' }, { status: 400 });
  }

  if (challenge.status === 'expired') {
    return NextResponse.json({ message: 'This challenge has expired' }, { status: 400 });
  }

  // Check if already a participant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alreadyJoined = challenge.participants.some(
    (p: any) => p.userId.toString() === userId.toString(),
  );
  if (alreadyJoined) {
    return NextResponse.json({ challenge, message: 'Already joined' });
  }

  // Check participant limit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeParticipants = challenge.participants.filter(
    (p: any) => p.status !== 'declined',
  ).length;
  if (activeParticipants >= challenge.maxParticipants) {
    return NextResponse.json({ message: 'This challenge is full' }, { status: 400 });
  }

  // Get user name
  const user = await User.findById(userId).select('name').lean();

  // Add participant
  challenge.participants.push({
    userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userName: (user as any)?.name || 'Unknown',
    status: 'accepted',
  });

  await challenge.save();

  return NextResponse.json({ challenge });
}
