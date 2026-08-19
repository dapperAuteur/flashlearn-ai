/**
 * Merge seeded cards into an existing flashcard set.
 *
 * Lives here rather than inside scripts/seedMathSets.ts so it can be tested
 * without executing the script, which connects to MongoDB the moment it is
 * imported.
 *
 * The rule that matters: match on externalId and keep the existing card _id.
 * Spaced-repetition schedules and CardResult rows point at those _ids, so
 * replacing the array wholesale on every re-seed would silently reset every
 * student's history. Cards a human added by hand carry no seeded externalId and
 * are carried through untouched.
 */

export interface SeedCardOption {
  id: string;
  text: string;
}

export interface SeedCard {
  externalId: string;
  front: string;
  back: string;
  options?: SeedCardOption[];
  correctOptionId?: string;
}

/** The subset of a stored flashcard this merge reads or writes. */
export interface StoredCard {
  externalId?: string;
  front: string;
  back: string;
  options?: SeedCardOption[];
  correctOptionId?: string;
}

export interface MergeResult<T> {
  cards: T[];
  added: number;
  changed: number;
  removed: number;
}

/** Every card this seed writes carries an externalId under this prefix. */
export const SEED_ID_PREFIX = 'math:';

function sameOptions(a: SeedCardOption[] | undefined, b: SeedCardOption[] | undefined): boolean {
  const normalize = (o: SeedCardOption[] | undefined) =>
    JSON.stringify(o?.map(({ id, text }) => ({ id, text })) ?? null);

  return normalize(a) === normalize(b);
}

export function mergeSeedCards<T extends StoredCard>(
  existing: T[],
  incoming: SeedCard[],
  prefix: string = SEED_ID_PREFIX,
): MergeResult<T> {
  const byExternalId = new Map(
    existing.filter((c) => c.externalId).map((c) => [c.externalId as string, c]),
  );
  const incomingIds = new Set(incoming.map((c) => c.externalId));

  let added = 0;
  let changed = 0;

  const merged = incoming.map((card) => {
    const prior = byExternalId.get(card.externalId);

    if (!prior) {
      added += 1;
      return { ...card } as unknown as T;
    }

    if (
      prior.front !== card.front ||
      prior.back !== card.back ||
      prior.correctOptionId !== card.correctOptionId ||
      !sameOptions(prior.options, card.options)
    ) {
      changed += 1;
    }

    // Keep the existing _id and anything else already on the card; overwrite
    // only the authored content.
    return {
      ...prior,
      front: card.front,
      back: card.back,
      options: card.options,
      correctOptionId: card.correctOptionId,
    };
  });

  const keptManual = existing.filter((c) => !c.externalId || !c.externalId.startsWith(prefix));
  const removed = existing.filter(
    (c) => c.externalId?.startsWith(prefix) && !incomingIds.has(c.externalId),
  ).length;

  return { cards: [...merged, ...keptManual], added, changed, removed };
}
