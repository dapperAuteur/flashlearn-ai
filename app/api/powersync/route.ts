import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Logger, LogContext } from '@/lib/logging/logger';
import mongoose from 'mongoose';

interface PullParams {
  last_synced_at?: string; // ISO timestamp
  include_checksum?: boolean;
}

interface PushChange {
  op: 'PUT' | 'PATCH' | 'DELETE';
  type: string; // table name
  id: string;
  data?: Record<string, unknown>;
}

/**
 * PowerSync endpoint: Handles bidirectional sync
 * GET = Pull (server → client)
 * POST = Push (client → server)
 */
export async function GET(request: NextRequest) {
  const requestId = await Logger.info(LogContext.STUDY, 'PowerSync pull request');
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const params: PullParams = {
      last_synced_at: request.nextUrl.searchParams.get('last_synced_at') || undefined,
    };

    await dbConnect();
    const changes = await handlePull(userId, params);

    await Logger.info(LogContext.STUDY, 'PowerSync pull completed', {
      requestId,
      userId,
      metadata: { recordCount: changes.data.length },
    });

    return NextResponse.json(changes);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(LogContext.STUDY, `PowerSync pull failed: ${errorMessage}`, {
      requestId,
      metadata: { error },
    });
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestId = await Logger.info(LogContext.STUDY, 'PowerSync push request');

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { changes } = await request.json();

    await dbConnect();
    await handlePush(userId, changes);

    await Logger.info(LogContext.STUDY, 'PowerSync push completed', {
      requestId,
      userId,
      metadata: { changeCount: changes.length },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(LogContext.STUDY, `PowerSync push failed: ${errorMessage}`, {
      requestId,
      metadata: { error },
    });
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

/**
 * Pull: Send server changes to client
 */
async function handlePull(userId: string, params: PullParams) {
  const lastSyncedAt = params.last_synced_at ? new Date(params.last_synced_at) : new Date(0);
  const data: Array<{ op: string; type: string; data: Record<string, unknown> }> = [];

  // Get user's profiles
  if (!mongoose.connection.db) {
 throw new Error('MongoDB connection not established.');
  }

  const userProfiles = await mongoose.connection.db
 .collection('profiles')
 .find({ user: new mongoose.Types.ObjectId(userId) })
    .toArray();
  const profileIds = userProfiles.map((p) => p._id);

  // Get flashcard sets updated since last sync
  const sets = await FlashcardSet.find({
    profile: { $in: profileIds },
    updatedAt: { $gt: lastSyncedAt },
  }).lean() as unknown as Array<{
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    isPublic: boolean;
    flashcards?: Array<{ _id: mongoose.Types.ObjectId; front: string; back: string }>;
    source: string;
    createdAt?: Date;
    updatedAt?: Date;
  }>;

  Logger.info(LogContext.POWERSYNC, 'Pull: Found flashcard sets', {
    userId,
    count: sets.length,
  });

  // Transform nested MongoDB structure to flat PowerSync tables
  for (const set of sets) {
    // Add set metadata (without nested flashcards)
    data.push({
      op: 'PUT',
      type: 'flashcard_sets',
      data: {
        id: set._id.toString(),
        user_id: userId,
        title: set.title,
        description: set.description || null,
        is_public: set.isPublic ? 1 : 0,
        card_count: set.flashcards?.length || 0,
        source: set.source,
        created_at: set.createdAt?.toISOString() || new Date().toISOString(),
        updated_at: set.updatedAt?.toISOString() || new Date().toISOString(),
        is_deleted: 0,
      },
    });

    // Flatten nested flashcards into separate records
    if (set.flashcards && Array.isArray(set.flashcards)) {
      set.flashcards.forEach((card, index) => {
        data.push({
          op: 'PUT',
          type: 'flashcards',
          data: {
            id: card._id.toString(),
            set_id: set._id.toString(),
            user_id: userId,
            front: card.front,
            back: card.back,
            front_image: null, // TODO: Add when image support ready
            back_image: null,
            order: index,
            created_at: set.createdAt?.toISOString() || new Date().toISOString(),
            updated_at: set.updatedAt?.toISOString() || new Date().toISOString(),
          },
        });
      });
    }
  }

  // TODO: Pull categories, offline_sets when implemented

  return {
    checkpoint: new Date().toISOString(),
    data,
  };
}

/**
 * Push: Receive client changes and update server
 */
async function handlePush(userId: string, changes: PushChange[]) {
  Logger.info(LogContext.POWERSYNC, 'Push: Processing changes', {
    userId,
    changeCount: changes.length,
  });

  for (const change of changes) {
    try {
      if (change.type === 'flashcard_sets') {
        await handleSetChange(userId, change);
      } else if (change.type === 'flashcards') {
        await handleCardChange(userId, change);
      }
      // TODO: Handle categories, offline_sets
    } catch (error) {
      Logger.error(LogContext.STUDY, 'Failed to process change', {
        userId,
        change,
        error,
      });
      // Continue processing other changes
    }
  }
}

/**
 * Handle flashcard_sets changes
 */
async function handleSetChange(userId: string, change: PushChange) {
  if (change.op === 'PUT' || change.op === 'PATCH') {
    // Get user's profile
    if (!mongoose.connection.db) {
 throw new Error('MongoDB connection not established.');
    }

    const profile = await mongoose.connection.db
 .collection('profiles')
 .findOne({ user: new mongoose.Types.ObjectId(userId) });

    if (!profile) {
      throw new Error('User profile not found');
    }

    const setData = {
      _id: new mongoose.Types.ObjectId(change.id),
      profile: profile._id,
      title: change.data?.title || 'Untitled',
      description: change.data?.description || '',
      isPublic: change.data?.is_public === 1,
      source: (change.data?.source as string) || 'CSV',
      cardCount: (change.data?.card_count as number) || 0,
      flashcards: [], // Will be populated by card changes
      createdAt: change.data?.created_at ? new Date(change.data.created_at as string) : new Date(),
      updatedAt: new Date(),
    };

    await FlashcardSet.findOneAndUpdate(
      { _id: setData._id },
      setData,
      { upsert: true, new: true }
    );

    Logger.info(LogContext.POWERSYNC, 'Set upserted', {
      userId,
      setId: change.id,
    });
  } else if (change.op === 'DELETE') {
    // Soft delete
    await FlashcardSet.updateOne(
      { _id: new mongoose.Types.ObjectId(change.id) },
      { $set: { isDeleted: true, updatedAt: new Date() } }
    );

    Logger.info(LogContext.POWERSYNC, 'Set soft deleted', {
      userId,
      setId: change.id,
    });
  }
}

/**
 * Handle flashcards changes
 * Reconstructs nested array structure for MongoDB
 */
async function handleCardChange(userId: string, change: PushChange) {
  if (change.op === 'PUT' || change.op === 'PATCH') {
    const setId = new mongoose.Types.ObjectId(change.data?.set_id as string);
    const cardId = new mongoose.Types.ObjectId(change.id);

    const cardData = {
      _id: cardId,
      front: change.data?.front || '',
      back: change.data?.back || '',
    };

    // Add or update card in set's flashcards array
    await FlashcardSet.updateOne(
      { _id: setId },
      {
        $pull: { flashcards: { _id: cardId } }, // Remove old version if exists
      }
    );

    await FlashcardSet.updateOne(
      { _id: setId },
      {
        $push: { flashcards: cardData },
        $set: { updatedAt: new Date() },
      }
    );

    // Update card count
    const set = await FlashcardSet.findById(setId);
    if (set) {
      await FlashcardSet.updateOne(
        { _id: setId },
        { $set: { cardCount: set.flashcards.length } }
      );
    }

    Logger.info(LogContext.POWERSYNC, 'Card upserted', {
      userId,
      setId: setId.toString(),
      cardId: change.id,
    });
  } else if (change.op === 'DELETE') {
    const setId = new mongoose.Types.ObjectId(change.data?.set_id as string);
    const cardId = new mongoose.Types.ObjectId(change.id);

    await FlashcardSet.updateOne(
      { _id: setId },
      {
        $pull: { flashcards: { _id: cardId } },
        $set: { updatedAt: new Date() },
      }
    );

    Logger.info(LogContext.POWERSYNC, 'Card deleted', {
      userId,
      setId: setId.toString(),
      cardId: change.id,
    });
  }
}