// app/api/sets/[id]/rating/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { SetRating } from '@/models/SetRating';
import { authOptions } from '@/lib/auth/auth';
import { Logger, LogContext } from '@/lib/logging/logger';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';
import {
  isValidRating,
  recomputeSetRating,
  MAX_RATING,
  MIN_RATING,
} from '@/lib/api/setRatings';

interface RatableSet {
  _id: Types.ObjectId;
  profile: Types.ObjectId;
  ratingAverage?: number;
  ratingCount?: number;
}

/**
 * Same visibility rule as `GET /api/sets/[id]`: a set is reachable when it is
 * public, or when it belongs to one of the caller's own profiles. A set the
 * caller cannot see answers 404, not 403, so this endpoint never confirms that
 * a private set exists.
 */
async function loadVisibleSet(
  setId: string,
  userId: string | undefined,
): Promise<{ set: RatableSet | null; ownedByCaller: boolean }> {
  let profileIds: Types.ObjectId[] = [];

  if (userId) {
    const profiles = await Profile.find({ user: new ObjectId(userId) })
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>();
    profileIds = profiles.map((p) => p._id);
  }

  const query = userId
    ? {
        _id: new ObjectId(setId),
        $or: [{ isPublic: true }, { profile: { $in: profileIds } }],
      }
    : { _id: new ObjectId(setId), isPublic: true };

  const set = await FlashcardSet.findOne(query)
    .select('_id profile ratingAverage ratingCount')
    .lean<RatableSet | null>();

  const ownedByCaller = Boolean(
    set && profileIds.some((id) => id.equals(set.profile)),
  );

  return { set, ownedByCaller };
}

function aggregateOf(set: RatableSet) {
  return {
    ratingAverage: set.ratingAverage ?? 0,
    ratingCount: set.ratingCount ?? 0,
  };
}

// GET /api/sets/[id]/rating - the caller's own rating plus the set's aggregate.
// Works signed out for public sets so the star display renders in one request
// whether or not anyone is logged in.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const setId = (await params).id;

    if (!ObjectId.isValid(setId)) {
      return NextResponse.json({ error: 'Invalid set ID' }, { status: 400 });
    }

    const { set, ownedByCaller } = await loadVisibleSet(setId, session?.user?.id);

    if (!set) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    let rating: number | null = null;
    if (session?.user?.id) {
      const existing = await SetRating.findOne({
        setId: new ObjectId(setId),
        user: new ObjectId(session.user.id),
      })
        .select('rating')
        .lean<{ rating: number } | null>();
      rating = existing?.rating ?? null;
    }

    return NextResponse.json({
      rating,
      canRate: Boolean(session?.user?.id) && !ownedByCaller,
      ...aggregateOf(set),
    });
  } catch (error) {
    Logger.error(LogContext.FLASHCARD, 'Error fetching set rating', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sets/[id]/rating - add or change the caller's rating.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const rateLimiter = getRateLimiter('set-rating', 30, 60);
      const { success } = await rateLimiter.limit(session.user.id);
      if (!success) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
    } catch {
      // Rate limiter unavailable — proceed without rate limiting
    }

    await dbConnect();
    const setId = (await params).id;

    if (!ObjectId.isValid(setId)) {
      return NextResponse.json({ error: 'Invalid set ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { rating } = body as { rating?: unknown };

    if (!isValidRating(rating)) {
      return NextResponse.json(
        { error: `Rating must be a whole number from ${MIN_RATING} to ${MAX_RATING}` },
        { status: 400 },
      );
    }

    const { set, ownedByCaller } = await loadVisibleSet(setId, session.user.id);

    if (!set) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    // Authors do not rate their own work. On a public catalogue the rating is a
    // signal for the next person browsing, and self-rating is the cheapest way
    // to make that signal meaningless.
    if (ownedByCaller) {
      return NextResponse.json(
        { error: 'You cannot rate your own set' },
        { status: 403 },
      );
    }

    const filter = {
      setId: new ObjectId(setId),
      user: new ObjectId(session.user.id),
    };

    try {
      await SetRating.updateOne(filter, { $set: { rating } }, { upsert: true });
    } catch (err: unknown) {
      // Two simultaneous first ratings from the same user both try to insert.
      // The unique index rejects the loser; updating the row the winner created
      // is the correct finish, not an error.
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        await SetRating.updateOne(filter, { $set: { rating } });
      } else {
        throw err;
      }
    }

    const aggregate = await recomputeSetRating(setId);

    Logger.info(LogContext.FLASHCARD, 'Flashcard set rated', {
      setId,
      userId: session.user.id,
      rating,
    });

    return NextResponse.json({ rating, ...aggregate });
  } catch (error) {
    Logger.error(LogContext.FLASHCARD, 'Error rating flashcard set', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sets/[id]/rating - clear the caller's rating.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    const { set } = await loadVisibleSet(setId, session.user.id);

    if (!set) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    await SetRating.deleteOne({
      setId: new ObjectId(setId),
      user: new ObjectId(session.user.id),
    });

    const aggregate = await recomputeSetRating(setId);

    Logger.info(LogContext.FLASHCARD, 'Flashcard set rating cleared', {
      setId,
      userId: session.user.id,
    });

    return NextResponse.json({ rating: null, ...aggregate });
  } catch (error) {
    Logger.error(LogContext.FLASHCARD, 'Error clearing flashcard set rating', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
