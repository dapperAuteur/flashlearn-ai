/* eslint-disable @typescript/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Follow } from '@/models/Follow';
import { User } from '@/models/User';
import { createActivityEvent } from '@/lib/services/activityService';

// Follow a user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    await dbConnect();

    // Check target user exists
    const targetUser = await User.findById(targetUserId).select('_id name username').lean() as any;
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already following
    const existing = await Follow.findOne({
      followerId: session.user.id,
      followingId: targetUserId,
    });

    if (existing) {
      return NextResponse.json({ error: 'Already following this user' }, { status: 409 });
    }

    // Create follow relationship
    await Follow.create({
      followerId: session.user.id,
      followingId: targetUserId,
    });

    // Update follower/following counts atomically
    await Promise.all([
      User.findByIdAndUpdate(session.user.id, { $inc: { followingCount: 1 } }),
      User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1 } }),
    ]);

    // Create activity event
    await createActivityEvent(session.user.id, 'follow', {
      targetUserId,
      targetUserName: targetUser.name,
      targetUsername: targetUser.username,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/follows]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Unfollow a user
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await dbConnect();

    const result = await Follow.findOneAndDelete({
      followerId: session.user.id,
      followingId: targetUserId,
    });

    if (!result) {
      return NextResponse.json({ error: 'Not following this user' }, { status: 404 });
    }

    // Update counts atomically
    await Promise.all([
      User.findByIdAndUpdate(session.user.id, { $inc: { followingCount: -1 } }),
      User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: -1 } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/follows]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
