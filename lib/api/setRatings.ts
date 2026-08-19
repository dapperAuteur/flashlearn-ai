import { Types } from 'mongoose';
import { FlashcardSet } from '@/models/FlashcardSet';
import { SetRating } from '@/models/SetRating';

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export interface RatingAggregate {
  ratingAverage: number;
  ratingCount: number;
}

/**
 * Ratings are whole stars. Anything else (0, 6, 4.5, "4", null) is rejected at
 * the route boundary rather than coerced, so a bad client cannot quietly skew
 * a public set's average.
 */
export function isValidRating(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_RATING &&
    value <= MAX_RATING
  );
}

/**
 * Recounts every rating on a set and writes the result to the set document.
 *
 * Recomputing from the collection rather than nudging a running total means a
 * changed rating, a cleared rating, and a rating written by a request that died
 * halfway all converge on the same answer. The two fields on FlashcardSet are a
 * cache of this query, and this is the only thing that writes them.
 */
export async function recomputeSetRating(
  setId: string | Types.ObjectId,
): Promise<RatingAggregate> {
  const setObjectId = new Types.ObjectId(String(setId));

  const [summary] = await SetRating.aggregate<{ sum: number; count: number }>([
    { $match: { setId: setObjectId } },
    { $group: { _id: '$setId', sum: { $sum: '$rating' }, count: { $sum: 1 } } },
  ]);

  const ratingCount = summary?.count ?? 0;
  // Two decimals is what the UI shows ("4.25 average"). Rounding here keeps the
  // stored value and the displayed value identical.
  const ratingAverage =
    ratingCount > 0 ? Math.round((summary.sum / ratingCount) * 100) / 100 : 0;

  await FlashcardSet.updateOne(
    { _id: setObjectId },
    { $set: { ratingAverage, ratingCount } },
  );

  return { ratingAverage, ratingCount };
}
