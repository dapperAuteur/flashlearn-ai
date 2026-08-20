import { describe, it, expect } from '@jest/globals';
import {
  generateMongoId,
  isValidMongoId,
  boolToInt,
  intToBool,
} from '../helpers';

describe('PowerSync Helpers', () => {
  it('generates valid MongoDB IDs', () => {
    const id = generateMongoId();
    expect(id).toHaveLength(24);
    expect(isValidMongoId(id)).toBe(true);
  });

  it('converts booleans correctly', () => {
    expect(boolToInt(true)).toBe(1);
    expect(boolToInt(false)).toBe(0);
    expect(intToBool(1)).toBe(true);
    expect(intToBool(0)).toBe(false);
  });
});

describe('PowerSync schema', () => {
  it('declares only the tables something actually reads', async () => {
    const { AppSchema } = await import('../schema');

    // `categories` used to sit here with two indexes and no reader, no writer,
    // and no puller. Categories come from /api/sets/categories. A local table
    // that nothing touches reads to the next person as an offline feature that
    // exists, so this asserts it stays gone.
    expect(AppSchema.tables.map((table) => table.name).sort()).toEqual([
      'flashcard_sets',
      'flashcards',
      'offline_sets',
    ]);
  });
});
