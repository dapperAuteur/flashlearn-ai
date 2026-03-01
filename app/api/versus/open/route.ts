import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { Challenge } from '@/models/Challenge';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const page = parseInt(searchParams.get('page') || '1', 10);

  const now = new Date();

  const challenges = await Challenge.find({
    scope: 'public',
    status: 'active',
    expiresAt: { $gt: now },
    $expr: { $lt: [{ $size: '$participants' }, '$maxParticipants'] },
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await Challenge.countDocuments({
    scope: 'public',
    status: 'active',
    expiresAt: { $gt: now },
    $expr: { $lt: [{ $size: '$participants' }, '$maxParticipants'] },
  });

  return NextResponse.json({ challenges, total, page, limit });
}
