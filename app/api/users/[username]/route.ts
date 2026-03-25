/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Achievement } from '@/models/Achievement';
import { VersusStats } from '@/models/VersusStats';

interface Params {
  params: Promise<{ username: string }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { username } = await params;
    await dbConnect();

    const user = await User.findOne({ username: username.toLowerCase() })
      .select('name username profilePicture bio studyInterests isProfilePublic showStats showActivity followersCount followingCount role createdAt')
      .lean() as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isProfilePublic) {
      return NextResponse.json({ error: 'This profile is private' }, { status: 403 });
    }

    const userId = user._id;

    // Gather stats if user allows
    let stats = null;
    if (user.showStats) {
      const [setCount, achievementCount, versusStats] = await Promise.all([
        FlashcardSet.countDocuments({ profile: { $in: user.profiles || [] }, isPublic: true }),
        Achievement.countDocuments({ userId }),
        VersusStats.findOne({ userId }).select('totalChallenges wins rating').lean() as any,
      ]);

      stats = {
        publicSets: setCount,
        achievements: achievementCount,
        versus: versusStats ? {
          totalChallenges: versusStats.totalChallenges,
          wins: versusStats.wins,
          rating: versusStats.rating,
        } : null,
      };
    }

    return NextResponse.json({
      user: {
        name: user.name,
        username: user.username,
        profilePicture: user.profilePicture,
        bio: user.bio,
        studyInterests: user.studyInterests,
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
        showStats: user.showStats,
        showActivity: user.showActivity,
        joinedAt: user.createdAt,
      },
      stats,
    });
  } catch (error) {
    console.error('[GET /api/users/[username]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
