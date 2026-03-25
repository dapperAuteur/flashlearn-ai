/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
import { getUserActivity } from '@/lib/services/activityService';

interface Params {
  params: Promise<{ username: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { username } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    await dbConnect();

    const user = await User.findOne({ username: username.toLowerCase() })
      .select('_id isProfilePublic showActivity')
      .lean() as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isProfilePublic || !user.showActivity) {
      return NextResponse.json({ error: 'Activity is not available for this profile' }, { status: 403 });
    }

    const events = await getUserActivity(user._id.toString(), {
      limit,
      offset,
      publicOnly: true,
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('[GET /api/users/[username]/activity]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
