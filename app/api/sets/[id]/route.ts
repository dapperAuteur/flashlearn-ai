/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/sets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { authOptions } from '@/lib/auth/auth';
import { Logger, LogContext } from '@/lib/logging/logger';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';

// GET /api/sets/[id] - Fetch full set with flashcards
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const setId = (await params).id;

    if (!ObjectId.isValid(setId)) {
      return NextResponse.json({ error: 'Invalid set ID' }, { status: 400 });
    }

    // Build query based on authentication
    let query: any = { _id: new ObjectId(setId) };
    
    if (session?.user?.id) {
      const userId = new ObjectId(session.user.id);
      const userProfiles = await Profile.find({ user: userId }).select('_id').lean();
      const userProfileIds = userProfiles.map(p => p._id);
      
      query = {
        _id: new ObjectId(setId),
        $or: [
          { isPublic: true },
          { profile: { $in: userProfileIds } }
        ]
      };
    } else {
      query.isPublic = true;
    }

    const flashcardSet = await FlashcardSet.findOne(query);
    
    if (!flashcardSet) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    return NextResponse.json(flashcardSet);
  } catch (error) {
    Logger.error(LogContext.FLASHCARD, 'Error fetching flashcard set', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/sets/[id] - Update set metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimiter = getRateLimiter('set-update', 30, 60);
    const { success } = await rateLimiter.limit(session.user.id);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    await dbConnect();
    const setId = (await params).id;

    if (!ObjectId.isValid(setId)) {
      return NextResponse.json({ error: 'Invalid set ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, isPublic, categories, tags } = body;

    // Find user's profiles
    const userId = new ObjectId(session.user.id);
    const userProfiles = await Profile.find({ user: userId }).select('_id').lean();
    const userProfileIds = userProfiles.map(p => p._id);

    // Find and update the set (only if user owns it)
    const updatedSet = await FlashcardSet.findOneAndUpdate(
      { 
        _id: new ObjectId(setId),
        profile: { $in: userProfileIds }
      },
      {
        title: title?.trim(),
        description: description?.trim(),
        isPublic: Boolean(isPublic),
        categories: Array.isArray(categories) ? categories : [],
        tags: Array.isArray(tags) ? tags : [],
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedSet) {
      return NextResponse.json({ error: 'Set not found or access denied' }, { status: 404 });
    }

    Logger.info(LogContext.FLASHCARD, 'Flashcard set updated', { 
      setId, 
      userId: session.user.id 
    });

    return NextResponse.json(updatedSet);
  } catch (error) {
    Logger.error(LogContext.FLASHCARD, 'Error updating flashcard set', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sets/[id] - Delete set
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const setId = (await params).id;

    if (!ObjectId.isValid(setId)) {
      return NextResponse.json({ error: 'Invalid set ID' }, { status: 400 });
    }

    // Find user's profiles
    const userId = new ObjectId(session.user.id);
    const userProfiles = await Profile.find({ user: userId }).select('_id').lean();
    const userProfileIds = userProfiles.map(p => p._id);

    // Delete the set (only if user owns it)
    const deletedSet = await FlashcardSet.findOneAndDelete({
      _id: new ObjectId(setId),
      profile: { $in: userProfileIds }
    });

    if (!deletedSet) {
      return NextResponse.json({ error: 'Set not found or access denied' }, { status: 404 });
    }

    Logger.info(LogContext.FLASHCARD, 'Flashcard set deleted', { 
      setId, 
      userId: session.user.id 
    });

    return NextResponse.json({ message: 'Set deleted successfully' });
  } catch (error) {
    Logger.error(LogContext.FLASHCARD, 'Error deleting flashcard set', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}