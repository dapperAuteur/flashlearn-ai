/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/sets/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { authOptions } from '@/lib/auth/auth';
import { Logger, LogContext } from '@/lib/logging/logger';

// GET /api/sets/categories - Get all categories for user's sets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // Get user's profile IDs
    const userProfiles = await Profile.find({ user: session.user.id }).select('_id').lean();
    const userProfileIds = userProfiles.map(p => p._id);

    // Get all categories from user's sets
    const sets = await FlashcardSet.find({ 
      profile: { $in: userProfileIds } 
    }).select('categories').lean();

    // Extract unique categories
    const allCategories = sets.flatMap(set => set.categories || []);
    const uniqueCategories = [...new Set(allCategories)].sort();

    return NextResponse.json(uniqueCategories);
  } catch (error) {
    Logger.error(LogContext.FLASHCARD, 'Error fetching categories', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}