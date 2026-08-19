/**
 * Loader for the curated math reference sets (geometry, trigonometry, calculus).
 *
 * Card content lives in JSON next to this file so anyone who knows the subject
 * can edit it without touching TypeScript. One file per subject, each holding
 * many small topic sets. This module reads those files from disk at call time,
 * which keeps several hundred cards of static content out of the app bundle. It
 * is Node-only: the seed script and the tests use it, the browser never does.
 *
 * Card ids are derived from the question text rather than array position, so
 * inserting a card in the middle of a file does not renumber every card after it
 * and orphan a student's review history on a re-seed.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ReferenceCard {
  front: string;
  back: string;
}

export interface ReferenceSet {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  cards: ReferenceCard[];
}

export interface ReferenceSubject {
  subject: string;
  sets: ReferenceSet[];
}

export const REFERENCE_DIR = join(process.cwd(), 'lib', 'data', 'math-reference');

/** A study set that is too short is not worth its own entry; too long defeats the point. */
export const MIN_CARDS_PER_SET = 10;
export const MAX_CARDS_PER_SET = 20;

/** Longest slug fragment kept from a question before the hash suffix. */
const SLUG_LIMIT = 48;

/**
 * Card text is rendered with dangerouslySetInnerHTML, so these characters would
 * be read as markup rather than as math. Content has to spell them out instead.
 */
const HTML_UNSAFE = /[<>&]/;

/**
 * A stable card id built from the set slug and the question text. Two cards with
 * the same question in the same set would collide, which is why the validator
 * rejects duplicate fronts.
 */
export function referenceCardExternalId(setSlug: string, front: string): string {
  const readable = front
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_LIMIT)
    .replace(/-+$/g, '');
  const digest = createHash('sha1').update(front).digest('hex').slice(0, 8);

  return `math:${setSlug}:${readable}-${digest}`;
}

function validateSet(set: ReferenceSet, file: string, seenFronts: Set<string>, seenSlugs: Set<string>): void {
  for (const field of ['slug', 'title', 'description'] as const) {
    if (typeof set[field] !== 'string' || !set[field].trim()) {
      throw new Error(`${file}: a set is missing "${field}".`);
    }
  }
  if (seenSlugs.has(set.slug)) throw new Error(`${file}: duplicate set slug "${set.slug}".`);
  seenSlugs.add(set.slug);

  if (!Array.isArray(set.tags) || set.tags.some((t) => typeof t !== 'string')) {
    throw new Error(`${file}: set "${set.slug}" needs a tags array of strings.`);
  }
  if (!Array.isArray(set.cards)) {
    throw new Error(`${file}: set "${set.slug}" needs a cards array.`);
  }
  if (set.cards.length < MIN_CARDS_PER_SET || set.cards.length > MAX_CARDS_PER_SET) {
    throw new Error(
      `${file}: set "${set.slug}" has ${set.cards.length} cards. Every set must hold ${MIN_CARDS_PER_SET} to ${MAX_CARDS_PER_SET}.`,
    );
  }

  set.cards.forEach((card, index) => {
    if (typeof card?.front !== 'string' || !card.front.trim()) {
      throw new Error(`${file}: ${set.slug} card ${index} has an empty front.`);
    }
    if (typeof card?.back !== 'string' || !card.back.trim()) {
      throw new Error(`${file}: ${set.slug} card ${index} ("${card.front}") has an empty back.`);
    }
    if (HTML_UNSAFE.test(card.front) || HTML_UNSAFE.test(card.back)) {
      throw new Error(
        `${file}: ${set.slug} card "${card.front}" uses one of < > & . Spell the comparison out instead.`,
      );
    }
    if (seenFronts.has(card.front)) {
      throw new Error(`${file}: duplicate front "${card.front}".`);
    }
    seenFronts.add(card.front);
  });
}

function parseSubject(raw: unknown, file: string): ReferenceSubject {
  const subject = raw as Partial<ReferenceSubject>;

  if (!subject || typeof subject !== 'object') throw new Error(`${file}: not a JSON object.`);
  if (typeof subject.subject !== 'string' || !subject.subject.trim()) {
    throw new Error(`${file}: "subject" must be a non-empty string.`);
  }
  if (!Array.isArray(subject.sets) || subject.sets.length === 0) {
    throw new Error(`${file}: "sets" must be a non-empty array.`);
  }

  const seenFronts = new Set<string>();
  const seenSlugs = new Set<string>();
  subject.sets.forEach((set) => validateSet(set, file, seenFronts, seenSlugs));

  return subject as ReferenceSubject;
}

/** Read and validate every reference subject file, sorted by filename. */
export function loadReferenceSubjects(dir: string = REFERENCE_DIR): ReferenceSubject[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  return files.map((file) => parseSubject(JSON.parse(readFileSync(join(dir, file), 'utf8')), file));
}

/** Every reference set across every subject, flattened in file order. */
export function loadReferenceSets(dir: string = REFERENCE_DIR): ReferenceSet[] {
  return loadReferenceSubjects(dir).flatMap((s) => s.sets);
}
