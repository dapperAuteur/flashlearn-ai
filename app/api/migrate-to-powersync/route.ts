/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
import mongoose from 'mongoose';
import { Logger, LogContext, LogLevel } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // Get user's profiles
    // const profiles = await Profile.find({ user: new mongoose.Types.ObjectId(session.user.id) });
    // const profileIds = profiles.map(p => p._id);

    const body = await request.json().catch(() => ({}));
    const { migrateAll = false, limit = 100, skip = 0 } = body;
    
    // Get all sets
    // const sets = await FlashcardSet.find({ profile: { $in: profileIds } }).lean();
    let sets;
    let totalCount;

    if (migrateAll) {
      // Admin migration - get ALL sets from MongoDB
      // WARNING: Only enable this for trusted admin users
      Logger.log({
        context: LogContext.SYSTEM,
        level: LogLevel.WARNING,
        message: 'Admin migration: Fetching ALL sets',
        userId: session.user.id,
      });

      totalCount = await FlashcardSet.countDocuments({});
      sets = await FlashcardSet.find({})
        .limit(limit)
        .skip(skip)
        .lean();

      Logger.log({
        context: LogContext.SYSTEM,
        level: LogLevel.INFO,
        message: 'Migration batch fetched',
        metadata: { 
          totalCount, 
          currentBatch: sets.length, 
          skip, 
          limit 
        },
      });
    } else {
      // Regular user migration - only their sets
      const Profile = (await import('@/models/Profile')).Profile;
      const profiles = await Profile.find({ 
        user: new mongoose.Types.ObjectId(session.user.id) 
      });
      const profileIds = profiles.map(p => p._id);

      totalCount = await FlashcardSet.countDocuments({ 
        profile: { $in: profileIds } 
      });
      sets = await FlashcardSet.find({ profile: { $in: profileIds } })
        .limit(limit)
        .skip(skip)
        .lean();
    }

    const formattedSets = sets.map(s => ({
      mongoId: s._id ? s._id.toString() : '',
      profileId: s.profile ? s.profile.toString() : '',
      title: s.title,
      description: s.description || null,
      isPublic: s.isPublic,
      cardCount: s.flashcards?.length || 0,
      source: s.source || 'CSV',
      flashcards: (s.flashcards || []).map((card: any) => ({
        front: card.front,
        back: card.back,
        frontImage: card.frontImage || null,
        backImage: card.backImage || null,
      })),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json({
      sets: formattedSets,
      pagination: {
        total: totalCount,
        returned: formattedSets.length,
        skip,
        limit,
        hasMore: skip + sets.length < totalCount,
      },
    });
  } catch (error) {
    Logger.log({
      context: LogContext.POWERSYNC,
      level: LogLevel.ERROR,
      message: 'PowerSync migration failed',
      metadata: { error: error instanceof Error ? error.message : error },
    });
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    }, {
      status: 500
    });
  }
}