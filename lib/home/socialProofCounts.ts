/**
 * Counting the two figures the signed-out homepage is allowed to print.
 *
 * Node-only. It reads the curated card files from disk and runs a Mongo
 * aggregate, so it belongs to the server component that renders the homepage
 * and never to a client bundle. The rule it enforces is in the contract next
 * door: a figure that cannot be counted right now comes back null, and the
 * page prints nothing rather than a guess.
 */
import dbConnect from '@/lib/db/dbConnect';
import { mathFactSets } from '@/lib/data/math-facts';
import { loadReferenceSets } from '@/lib/data/math-reference/loadSets';
import { StudySession } from '@/models/StudySession';
import {
  ACTIVE_WINDOW_DAYS,
  LEARNER_COUNT_RETRY_MS,
  LEARNER_COUNT_TTL_MS,
  type HomeSocialProof,
} from '@/lib/home/socialProof';

let cachedSetCount: number | null | undefined;

/**
 * Curated sets that are ready to study: the generated math fact families plus
 * the geometry, trigonometry and calculus files. Counted from the same
 * functions the seed script uses, so adding a set moves this number and nobody
 * has to remember to edit a marketing line.
 *
 * Deliberately not counting public sets that users have made. Those come and go
 * and vary in quality, so folding them in would make the claim drift for
 * reasons a visitor cannot see. The curated total is the floor, it is stable,
 * and clicking Explore checks it in about ten seconds.
 *
 * The content is static for the life of the process, so this runs once.
 */
export function readyToStudySetCount(): number | null {
  if (cachedSetCount !== undefined) return cachedSetCount;

  try {
    cachedSetCount = mathFactSets().length + loadReferenceSets().length;
  } catch (error) {
    // Rendering no claim beats rendering a guess, so a missing or malformed
    // content file costs the line rather than replacing it with a literal.
    console.error('Home social proof: curated set count unavailable', error);
    cachedSetCount = null;
  }

  return cachedSetCount;
}

let learnerCache: { value: number | null; expires: number } | null = null;
let learnerInFlight: Promise<number | null> | null = null;

async function countActiveLearners(): Promise<number | null> {
  try {
    await dbConnect();

    const since = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await StudySession.aggregate([
      { $match: { status: 'completed', startTime: { $gte: since } } },
      // Group first, count second: one account with two hundred sessions is one
      // learner, and the claim is about people rather than about sessions.
      { $group: { _id: '$userId' } },
      { $count: 'learners' },
    ]);

    const learners = Number(rows?.[0]?.learners);
    return Number.isFinite(learners) ? learners : 0;
  } catch (error) {
    console.error('Home social proof: active learner count unavailable', error);
    return null;
  }
}

/**
 * Accounts that finished a study session in the last 30 days.
 *
 * Cached for an hour so the homepage does not run an aggregate per visit, and
 * shared while in flight so a burst of visits runs one query between them. A
 * failure caches null briefly and the page prints nothing, which is the whole
 * point: the number is either real or absent.
 */
export async function activeLearnerCount(): Promise<number | null> {
  const now = Date.now();
  if (learnerCache && learnerCache.expires > now) return learnerCache.value;

  if (!learnerInFlight) {
    learnerInFlight = countActiveLearners().then((value) => {
      learnerCache = {
        value,
        expires: Date.now() + (value === null ? LEARNER_COUNT_RETRY_MS : LEARNER_COUNT_TTL_MS),
      };
      learnerInFlight = null;
      return value;
    });
  }

  return learnerInFlight;
}

/** Test seam: drops both caches so each case starts from nothing. */
export function resetHomeSocialProofCache() {
  cachedSetCount = undefined;
  learnerCache = null;
  learnerInFlight = null;
}

export async function homeSocialProof(): Promise<HomeSocialProof> {
  return {
    setCount: readyToStudySetCount(),
    activeLearners: await activeLearnerCount(),
  };
}
