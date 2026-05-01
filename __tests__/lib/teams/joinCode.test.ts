jest.mock('../../../models/Team', () => {
  let collisionMode: 'never' | 'twice' | 'always' = 'never';
  let calls = 0;
  return {
    Team: {
      findOne: jest.fn(() => ({
        select: jest.fn(() => ({
          lean: jest.fn(async () => {
            calls += 1;
            if (collisionMode === 'always') return { _id: 'x' };
            if (collisionMode === 'twice' && calls <= 2) return { _id: 'x' };
            return null;
          }),
        })),
      })),
      __setCollisionMode: (mode: 'never' | 'twice' | 'always') => {
        collisionMode = mode;
        calls = 0;
      },
    },
  };
});

import { generateUniqueJoinCode } from '@/lib/teams/joinCode';
import { Team } from '@/models/Team';

describe('generateUniqueJoinCode', () => {
  beforeEach(() => {
    (Team as unknown as { __setCollisionMode: (m: 'never' | 'twice' | 'always') => void }).__setCollisionMode('never');
  });

  it('returns a 6-digit string with no leading zero', async () => {
    const code = await generateUniqueJoinCode();
    expect(code).toMatch(/^[1-9]\d{5}$/);
    const numeric = Number(code);
    expect(numeric).toBeGreaterThanOrEqual(100_000);
    expect(numeric).toBeLessThanOrEqual(999_999);
  });

  it('retries on collision and eventually returns a unique code', async () => {
    (Team as unknown as { __setCollisionMode: (m: 'never' | 'twice' | 'always') => void }).__setCollisionMode('twice');
    const code = await generateUniqueJoinCode();
    expect(code).toMatch(/^[1-9]\d{5}$/);
  });

  it('throws after MAX_ATTEMPTS if every code collides', async () => {
    (Team as unknown as { __setCollisionMode: (m: 'never' | 'twice' | 'always') => void }).__setCollisionMode('always');
    await expect(generateUniqueJoinCode()).rejects.toThrow(/unique join code/);
  });
});
