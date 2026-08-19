/**
 * @jest-environment node
 */
import {
  ARCHIVED_MESSAGES,
  ARCHIVED_STATUS,
  assertNotArchived,
  isArchivedContainer,
} from '@/lib/api/assertNotArchived';

describe('isArchivedContainer', () => {
  it('is true only when isArchived is exactly true', () => {
    expect(isArchivedContainer({ isArchived: true })).toBe(true);
    expect(isArchivedContainer({ isArchived: false })).toBe(false);
    expect(isArchivedContainer({ isArchived: null })).toBe(false);
    expect(isArchivedContainer({})).toBe(false);
  });

  it('treats a missing container as not archived so 404 handling stays in the route', () => {
    expect(isArchivedContainer(null)).toBe(false);
    expect(isArchivedContainer(undefined)).toBe(false);
  });
});

describe('assertNotArchived', () => {
  it('returns null for an active container so the write proceeds', () => {
    expect(assertNotArchived({ isArchived: false }, 'classroom')).toBeNull();
    expect(assertNotArchived({}, 'team')).toBeNull();
    expect(assertNotArchived(null, 'school')).toBeNull();
  });

  it('returns 409 Conflict, not 403, for an archived container', async () => {
    const res = assertNotArchived({ isArchived: true }, 'classroom');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(ARCHIVED_STATUS);
    expect(res!.status).toBe(409);
    await expect(res!.json()).resolves.toEqual({ error: ARCHIVED_MESSAGES.classroom });
  });

  it('names the container the caller was writing to', async () => {
    const team = assertNotArchived({ isArchived: true }, 'team');
    const school = assertNotArchived({ isArchived: true }, 'school');
    await expect(team!.json()).resolves.toEqual({ error: ARCHIVED_MESSAGES.team });
    await expect(school!.json()).resolves.toEqual({ error: ARCHIVED_MESSAGES.school });
  });

  it('explains the cause and the way out in every message', () => {
    for (const message of Object.values(ARCHIVED_MESSAGES)) {
      expect(message).toMatch(/archived/i);
      expect(message).toMatch(/account was deleted/i);
      expect(message).toMatch(/reassigns it/i);
    }
  });
});
