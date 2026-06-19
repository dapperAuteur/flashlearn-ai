import { hasPermission } from '@/lib/api/permissions';
import { DEFAULT_PERMISSIONS } from '@/types/api';

describe('hasPermission matcher', () => {
  it('grants everything for the global wildcard', () => {
    expect(hasPermission(['*'], 'anything:here')).toBe(true);
  });

  it('expands prefix wildcards on the bare prefix', () => {
    expect(hasPermission(['kids:*'], 'kids:write')).toBe(true);
    expect(hasPermission(['kids:*'], 'kids:read')).toBe(true);
    expect(hasPermission(['study:*'], 'study:write')).toBe(true);
  });

  it('does NOT let kids:* satisfy a sessions:/mastery:/children: scope (the latent bug)', () => {
    // The child-flow routes used to require these; no key was ever granted them.
    expect(hasPermission(['kids:*'], 'sessions:write')).toBe(false);
    expect(hasPermission(['kids:*'], 'mastery:read')).toBe(false);
    expect(hasPermission(['kids:*'], 'children:delete')).toBe(false);
  });

  it('matches exact non-wildcard permissions', () => {
    expect(hasPermission(['sets:write'], 'sets:write')).toBe(true);
    expect(hasPermission(['sets:read'], 'sets:write')).toBe(false);
  });
});

describe('ecosystem default permissions reach the routes CentOS uses', () => {
  const eco = DEFAULT_PERMISSIONS.ecosystem;

  it('can run the Sets + Study loop', () => {
    for (const scope of ['sets:read', 'sets:write', 'study:read', 'study:write', 'categories:read']) {
      expect(hasPermission(eco, scope)).toBe(true);
    }
  });

  it('can run the child flow via kids:* (sessions/mastery/children routes)', () => {
    for (const scope of ['kids:write', 'kids:read', 'kids:delete']) {
      expect(hasPermission(eco, scope)).toBe(true);
    }
  });
});
