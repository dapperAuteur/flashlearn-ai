/**
 * Guards the authored geometry, trigonometry, and calculus content. These are
 * checks a human editor can trip over: a set that grew past 20 cards, a question
 * pasted twice, a "less than" written as a raw angle bracket that the card
 * renderer would swallow as markup.
 */
import { readdirSync } from 'node:fs';

import {
  loadReferenceSets,
  loadReferenceSubjects,
  MAX_CARDS_PER_SET,
  MIN_CARDS_PER_SET,
  REFERENCE_DIR,
  referenceCardExternalId,
} from '@/lib/data/math-reference/loadSets';

describe('referenceCardExternalId', () => {
  it('builds a readable, stable id from the set slug and the question', () => {
    const id = referenceCardExternalId('geometry-circles', 'What is the area of a circle?');

    expect(id).toMatch(/^math:geometry-circles:what-is-the-area-of-a-circle-[0-9a-f]{8}$/);
    expect(referenceCardExternalId('geometry-circles', 'What is the area of a circle?')).toBe(id);
  });

  it('changes when the question changes, so an edited card is not mistaken for the old one', () => {
    expect(referenceCardExternalId('s', 'Question A')).not.toBe(referenceCardExternalId('s', 'Question B'));
  });
});

describe('authored math reference content', () => {
  const subjects = loadReferenceSubjects();
  const sets = loadReferenceSets();

  it('ships a file for every subject in the directory', () => {
    const files = readdirSync(REFERENCE_DIR).filter((f) => f.endsWith('.json'));

    expect(files.length).toBeGreaterThan(0);
    expect(subjects).toHaveLength(files.length);
    expect(subjects.map((s) => s.subject).sort()).toEqual(['calculus', 'geometry', 'trigonometry']);
  });

  it('keeps every set between 10 and 20 cards', () => {
    for (const set of sets) {
      expect(set.cards.length).toBeGreaterThanOrEqual(MIN_CARDS_PER_SET);
      expect(set.cards.length).toBeLessThanOrEqual(MAX_CARDS_PER_SET);
    }
  });

  it('uses a unique slug per set', () => {
    expect(new Set(sets.map((s) => s.slug)).size).toBe(sets.length);
  });

  it('asks each question only once across the whole library', () => {
    const fronts = sets.flatMap((s) => s.cards.map((c) => c.front));

    expect(new Set(fronts).size).toBe(fronts.length);
  });

  it('produces a unique card id per set', () => {
    for (const set of sets) {
      const ids = set.cards.map((c) => referenceCardExternalId(set.slug, c.front));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('avoids characters the card renderer would read as markup', () => {
    // components/study/StudyCard.tsx renders card text with dangerouslySetInnerHTML.
    for (const set of sets) {
      for (const card of set.cards) {
        expect(card.front).not.toMatch(/[<>&]/);
        expect(card.back).not.toMatch(/[<>&]/);
      }
    }
  });

  it('keeps card text on one line and within a readable length', () => {
    for (const set of sets) {
      for (const card of set.cards) {
        expect(card.front).not.toMatch(/[\n\r\t]/);
        expect(card.back).not.toMatch(/[\n\r\t]/);
        expect(card.front.length).toBeLessThanOrEqual(120);
        expect(card.back.length).toBeLessThanOrEqual(240);
      }
    }
  });

  it('gives every set a title, a description, and tags', () => {
    for (const set of sets) {
      expect(set.title.trim().length).toBeGreaterThan(0);
      expect(set.description.trim().length).toBeGreaterThan(0);
      expect(set.tags.length).toBeGreaterThan(0);
    }
  });
});
