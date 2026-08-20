import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { FlashcardSet } from '@/models/FlashcardSet';
import { LibraryEntry } from '@/models/LibraryEntry';
import { Profile } from '@/models/Profile';
// Registers the Category model so the populate below resolves on a cold start.
import { Category } from '@/models/Category';
import { Logger, LogContext } from '@/lib/logging/logger';
import {
  LIBRARY_DEFAULT_SORT,
  addSetToLibrary,
  canProfileSeeSet,
  removeSetFromLibrary,
} from '@/lib/library/libraryService';
import { resolveProfileId } from '@/lib/study/resolveStudySubject';

void Category;

interface CallerScope {
  profileId: Types.ObjectId;
  profileIds: Types.ObjectId[];
}

/**
 * Who is asking, and which profile their shelf belongs to.
 *
 * `profileId` is the shelf itself, and matches the profile the study sync
 * routes write StudyAnalytics to for self-study. `profileIds` is every profile
 * on the account, used only to decide whether a private set is visible, so a
 * second profile's private set is not hidden from its own owner.
 */
async function resolveCaller(): Promise<CallerScope | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !Types.ObjectId.isValid(session.user.id)) return null;

  const userId = new Types.ObjectId(session.user.id);
  const profiles = await Profile.find({ user: userId }).select('_id').lean();
  const profileIds = profiles.map((p) => p._id as Types.ObjectId);

  const profileId = profileIds.length ? profileIds[0] : await resolveProfileId(userId);
  if (!profileIds.length) profileIds.push(profileId);

  return { profileId, profileIds };
}

/** Reads setId from the query string, falling back to a JSON body. */
async function readSetId(request: NextRequest): Promise<string | null> {
  const fromQuery = request.nextUrl.searchParams.get('setId');
  if (fromQuery) return fromQuery;
  try {
    const body = await request.json();
    return typeof body?.setId === 'string' ? body.setId : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/library
 *
 * The signed-in learner's own shelf, most recently studied first, then most
 * recently added. Pinned entries sort above both, which is what a
 * teacher-assigned set will use.
 *
 * `?view=ids` returns just the set ids. Explore uses that to mark which cards
 * are already on the shelf without pulling every title down again.
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const caller = await resolveCaller();
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (request.nextUrl.searchParams.get('view') === 'ids') {
      const ids = await LibraryEntry.find({ profile: caller.profileId })
        .select('set')
        .lean();
      return NextResponse.json({
        setIds: ids.map((e: Record<string, unknown>) => String(e.set)),
      });
    }

    const entries = await LibraryEntry.find({ profile: caller.profileId })
      .sort(LIBRARY_DEFAULT_SORT)
      .populate({
        path: 'set',
        select:
          'title description cardCount source categories tags isPublic profile ratingAverage ratingCount',
        populate: { path: 'categories', select: 'name slug color' },
      })
      .lean();

    // A set deleted out from under the shelf leaves an entry pointing at
    // nothing. Skip those rather than rendering an empty card.
    const ownedProfileIds = new Set(caller.profileIds.map(String));
    const sets = entries
      .filter((e: Record<string, unknown>) => e.set)
      .map((e: Record<string, unknown>) => {
        const set = e.set as Record<string, unknown>;
        return {
          id: String(set._id),
          title: set.title,
          description: (set.description as string) || '',
          cardCount: set.cardCount ?? 0,
          source: set.source,
          categories: set.categories || [],
          tags: set.tags || [],
          isPublic: Boolean(set.isPublic),
          isOwned: ownedProfileIds.has(String(set.profile)),
          ratingAverage: (set.ratingAverage as number) ?? 0,
          ratingCount: (set.ratingCount as number) ?? 0,
          addedAt: e.addedAt,
          lastStudiedAt: e.lastStudiedAt ?? null,
          pinned: Boolean(e.pinned),
        };
      });

    return NextResponse.json({ sets, total: sets.length });
  } catch (error) {
    await Logger.error(LogContext.FLASHCARD, 'Failed to read library', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/library  { setId }
 *
 * Adds by reference. Adding a set that is already there answers 200 and changes
 * nothing, so a double tap cannot duplicate the row or move an old set back to
 * the top of "recently added".
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const caller = await resolveCaller();
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const setId = await readSetId(request);
    if (!setId || !Types.ObjectId.isValid(setId)) {
      return NextResponse.json({ error: 'A valid setId is required.' }, { status: 400 });
    }

    const setObjectId = new Types.ObjectId(setId);

    // A set the caller cannot see is reported as missing, never as forbidden.
    // 403 would confirm that a private set with this id exists.
    const visible = await canProfileSeeSet(caller.profileIds, setObjectId);
    if (!visible) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    const { created } = await addSetToLibrary(caller.profileId, setObjectId);

    const set = await FlashcardSet.findById(setObjectId)
      .select('title cardCount')
      .lean<{ title?: string; cardCount?: number } | null>();

    return NextResponse.json(
      {
        added: true,
        created,
        set: { id: setId, title: set?.title ?? '', cardCount: set?.cardCount ?? 0 },
      },
      { status: created ? 201 : 200 },
    );
  } catch (error) {
    await Logger.error(LogContext.FLASHCARD, 'Failed to add set to library', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/library?setId=...
 *
 * Removes the entry and nothing else. StudyAnalytics for (profile, set) stays,
 * so adding the set back later picks the streak up where it left off.
 */
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const caller = await resolveCaller();
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const setId = await readSetId(request);
    if (!setId || !Types.ObjectId.isValid(setId)) {
      return NextResponse.json({ error: 'A valid setId is required.' }, { status: 400 });
    }

    // Scoped to the caller's own profile, so a setId belonging to somebody
    // else's shelf matches nothing.
    const { removed } = await removeSetFromLibrary(
      caller.profileId,
      new Types.ObjectId(setId),
    );

    return NextResponse.json({ removed });
  } catch (error) {
    await Logger.error(LogContext.FLASHCARD, 'Failed to remove set from library', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
