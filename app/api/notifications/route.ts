import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Notification } from '@/models/Notification';
import mongoose from 'mongoose';

// GET - Fetch user's notifications
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const userId = new mongoose.Types.ObjectId(session.user.id);
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const filter: Record<string, unknown> = { userId };
    if (unreadOnly) filter.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[notifications] GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const userId = new mongoose.Types.ObjectId(session.user.id);
    const { ids, all } = await request.json();

    if (all) {
      await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    } else if (ids?.length) {
      await Notification.updateMany(
        { _id: { $in: ids }, userId },
        { isRead: true }
      );
    }

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error('[notifications] PATCH error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
