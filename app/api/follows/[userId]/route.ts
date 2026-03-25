/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Follow } from '@/models/Follow';
import { User } from '@/models/User';

interface Params {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'followers';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    await dbConnect();

    let follows;
    let populateField: string;

    if (type === 'following') {
      follows = await Follow.find({ followerId: userId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();
      populateField = 'followingId';
    } else {
      follows = await Follow.find({ followingId: userId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean();
      populateField = 'followerId';
    }

    // Get user details for each follow
    const userIds = follows.map((f: any) => f[populateField]);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name username profilePicture bio')
      .lean() as any[];

    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const results = follows.map((f: any) => {
      const id = f[populateField].toString();
      const user = userMap.get(id);
      return {
        userId: id,
        name: user?.name,
        username: user?.username,
        profilePicture: user?.profilePicture,
        bio: user?.bio,
        followedAt: f.createdAt,
      };
    });

    return NextResponse.json({ users: results, type });
  } catch (error) {
    console.error('[GET /api/follows/[userId]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
