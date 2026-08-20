import { Types } from 'mongoose';
import { FlashcardSet } from '@/models/FlashcardSet';
import { LibraryEntry } from '@/models/LibraryEntry';

/**
 * The one place that writes library_entries.
 *
 * Every caller goes through here so that "in my library" has a single
 * definition. The API route, the two set-creation routes, and the two study
 * sync routes all use these functions rather than touching the collection.
 */

/** Sort for the default library view. See the index on the model. */
export const LIBRARY_DEFAULT_SORT: Record<string, 1 | -1> = {
  pinned: -1,
  lastStudiedAt: -1,
  addedAt: -1,
};

/**
 * Can this profile put this set on its shelf?
 *
 * Public sets are open to everyone. A private set is visible only to the
 * profiles of the account that owns it. Anything else reads as "no such set",
 * deliberately: answering 403 would confirm that a private set with that id
 * exists, which is the same rule GET /api/sets/[id] follows.
 */
export async function canProfileSeeSet(
  profileIds: Types.ObjectId[],
  setId: Types.ObjectId,
): Promise<boolean> {
  const visible = await FlashcardSet.exists({
    _id: setId,
    $or: [{ isPublic: true }, { profile: { $in: profileIds } }],
  });
  return Boolean(visible);
}

/**
 * Put a set on a profile's shelf, or leave it exactly as it is if it is already
 * there. `$setOnInsert` on addedAt is what makes a second add a no-op instead of
 * resetting the "recently added" position of a set the learner has had for
 * months.
 *
 * Returns whether a new row was written, so the route can answer 201 or 200.
 */
export async function addSetToLibrary(
  profileId: Types.ObjectId,
  setId: Types.ObjectId,
): Promise<{ created: boolean }> {
  try {
    const result = await LibraryEntry.updateOne(
      { profile: profileId, set: setId },
      { $setOnInsert: { profile: profileId, set: setId, addedAt: new Date() } },
      { upsert: true },
    );
    return { created: Boolean(result.upsertedCount) };
  } catch (error) {
    // Two taps landing at once both miss the existing row and both try to
    // insert. The unique index rejects the loser, which is the index doing its
    // job, not a failure worth reporting: the set is on the shelf either way.
    if ((error as { code?: number })?.code === 11000) return { created: false };
    throw error;
  }
}

/**
 * Take a set off the shelf. Study progress is NOT touched: StudyAnalytics is
 * keyed on (profile, set) and outlives the entry, so adding the set back
 * restores the streak instead of starting from zero.
 */
export async function removeSetFromLibrary(
  profileId: Types.ObjectId,
  setId: Types.ObjectId,
): Promise<{ removed: boolean }> {
  const result = await LibraryEntry.deleteOne({ profile: profileId, set: setId });
  return { removed: result.deletedCount > 0 };
}

/**
 * Move a set to the top of the default view after a session for it finishes.
 *
 * No upsert. Studying a set is not the same as choosing to keep it, so a set the
 * learner never added stays out of their library. This runs alongside the
 * existing StudyAnalytics write rather than as a second sync path, and it is
 * called after the transaction commits so a rolled-back session cannot leave a
 * timestamp behind.
 */
export async function touchLibraryEntry(
  profileId: Types.ObjectId,
  setId: Types.ObjectId,
): Promise<void> {
  await LibraryEntry.updateOne(
    { profile: profileId, set: setId },
    { $set: { lastStudiedAt: new Date() } },
  );
}
