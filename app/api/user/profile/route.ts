import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';

const PROFILE_FIELDS = 'name email username profilePicture role subscriptionTier createdAt';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select(PROFILE_FIELDS)
    .lean();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const body = await request.json();
  const { name, username } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (name.trim().length > 100) {
    return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { name: name.trim() };

  // Handle username update
  if (username !== undefined) {
    if (username === '' || username === null) {
      // Allow clearing username
      updateData.username = null;
    } else {
      const trimmed = username.trim().toLowerCase();
      if (trimmed.length < 3 || trimmed.length > 20) {
        return NextResponse.json({ error: 'Username must be between 3 and 20 characters' }, { status: 400 });
      }
      if (!/^[a-z0-9_-]+$/.test(trimmed)) {
        return NextResponse.json({ error: 'Username can only contain lowercase letters, numbers, underscores, and hyphens' }, { status: 400 });
      }
      // Check uniqueness (exclude current user)
      const existing = await User.findOne({ username: trimmed, _id: { $ne: session.user.id } });
      if (existing) {
        return NextResponse.json({ error: 'This username is already taken' }, { status: 409 });
      }
      updateData.username = trimmed;
    }
  }

  const user = await User.findByIdAndUpdate(
    session.user.id,
    updateData,
    { new: true, select: PROFILE_FIELDS }
  ).lean();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user, message: 'Profile updated successfully' });
}
