import { detectKeyType } from '@/lib/api/detectKeyType';
import { API_KEY_PREFIXES, type ApiKeyType } from '@/types/api';

describe('detectKeyType', () => {
  it('recognizes ecosystem keys (the fl_eco_ 401 regression)', () => {
    expect(detectKeyType('fl_eco_abc123DEF456')).toBe('ecosystem');
  });

  it('resolves a real key for every prefix in API_KEY_PREFIXES', () => {
    for (const [keyType, prefix] of Object.entries(API_KEY_PREFIXES) as [ApiKeyType, string][]) {
      expect(detectKeyType(`${prefix}somerandomsecret`)).toBe(keyType);
    }
  });

  it('disambiguates admin_public (fl_adm_pub_) from admin (fl_admin_)', () => {
    expect(detectKeyType('fl_adm_pub_secret')).toBe('admin_public');
    expect(detectKeyType('fl_admin_secret')).toBe('admin');
  });

  it('returns null for an unknown prefix', () => {
    expect(detectKeyType('sk_live_whatever')).toBeNull();
    expect(detectKeyType('fl_unknown_secret')).toBeNull();
    expect(detectKeyType('')).toBeNull();
  });
});
