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