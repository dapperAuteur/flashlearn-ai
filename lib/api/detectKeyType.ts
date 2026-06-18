import { API_KEY_PREFIXES, type ApiKeyType } from '@/types/api';

// Match the longest prefix first so overlapping prefixes resolve correctly
// (e.g. `fl_adm_pub_` must win before the shorter `fl_admin_`/`fl_app_`). Derived
// from API_KEY_PREFIXES so adding a new key type there is enough; the detector can
// never silently miss one again, which is the bug that rejected every fl_eco_ key.
const KEY_PREFIXES_BY_LENGTH = (Object.entries(API_KEY_PREFIXES) as [ApiKeyType, string][])
  .sort((a, b) => b[1].length - a[1].length);

/**
 * Detects the key type from the prefix of the API key string.
 * Covers every type in API_KEY_PREFIXES (admin, admin_public, app, public,
 * ecosystem), longest prefix first. Pure: no DB or model imports, so it stays
 * unit-testable in isolation.
 */
export function detectKeyType(key: string): ApiKeyType | null {
  for (const [keyType, prefix] of KEY_PREFIXES_BY_LENGTH) {
    if (key.startsWith(prefix)) return keyType;
  }
  return null;
}
