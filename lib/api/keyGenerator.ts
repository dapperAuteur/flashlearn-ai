import { randomBytes, createHash } from 'crypto';
import { API_KEY_PREFIXES, type ApiKeyType } from '@/types/api';

interface GeneratedKey {
  /** The full plaintext key (shown once to user, never stored) */
  plaintext: string;
  /** SHA-256 hash of the full key (stored in database) */
  keyHash: string;
  /** Displayable prefix for identifying the key (stored in database) */
  keyPrefix: string;
}

/**
 * Generates a new API key with the appropriate prefix for the given key type.
 * Returns the plaintext key (shown once), its hash (stored), and a display prefix.
 */
export function generateApiKey(keyType: ApiKeyType): GeneratedKey {
  const prefix = API_KEY_PREFIXES[keyType];
  const randomPart = randomBytes(32).toString('base64url');
  const plaintext = `${prefix}${randomPart}`;
  const keyHash = createHash('sha256').update(plaintext).digest('hex');
  // Store enough of the key for identification without exposing the secret
  const keyPrefix = plaintext.slice(0, prefix.length + 8);

  return { plaintext, keyHash, keyPrefix };
}

/**
 * Hashes a raw API key string for lookup.
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}
