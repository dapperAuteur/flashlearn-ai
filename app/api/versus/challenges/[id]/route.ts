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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid challenge ID' }, { status: 400 });
  }

  const challenge = await Challenge.findById(id).lean();
  if (!challenge) {
    return NextResponse.json({ message: 'Challenge not found' }, { status: 404 });
  }

  const userId = session.user.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myParticipation = (challenge as any).participants?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.userId.toString() === userId,
  ) || null;

  return NextResponse.json({ challenge, myParticipation });
}
