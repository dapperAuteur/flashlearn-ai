import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Webhook secrets must be reversibly stored: we sign outbound HMAC bodies
// with the same plaintext the consumer holds. bcrypt hashes can't sign,
// so we encrypt-at-rest with AES-256-GCM keyed by WEBHOOK_ENCRYPTION_KEY.
//
// Storage format (single string, ":"-delimited base64url segments):
//   v1:<iv><cipher>:<tag>
//
// On rotation: bump WEBHOOK_ENCRYPTION_KEY_V2, write a v2 codec, fall back
// to v1 for legacy rows. v1 is what we ship.

const VERSION = 'v1';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

function getKey(): Buffer {
  const raw = process.env.WEBHOOK_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'WEBHOOK_ENCRYPTION_KEY env var is required to encrypt/decrypt webhook secrets. Generate 32 random bytes and store as 64-char hex.',
    );
  }
  // Accept hex (64 chars) or base64 (44 chars).
  const buf = raw.length === 64
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `WEBHOOK_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${buf.length}). Generate with: openssl rand -hex 32`,
    );
  }
  return buf;
}

// Generates a random plaintext webhook secret (URL-safe base64).
// 32 bytes ≈ 256 bits of entropy.
export function generateWebhookSecret(): string {
  return 'whsec_' + randomBytes(32).toString('base64url');
}

export function encryptWebhookSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    Buffer.concat([iv, encrypted]).toString('base64url'),
    tag.toString('base64url'),
  ].join(':');
}

export function decryptWebhookSecret(stored: string): string {
  const [version, ivCipherB64, tagB64] = stored.split(':');
  if (version !== VERSION) {
    throw new Error(`Unsupported webhook secret version: ${version}`);
  }
  if (!ivCipherB64 || !tagB64) {
    throw new Error('Malformed encrypted webhook secret');
  }
  const key = getKey();
  const ivCipher = Buffer.from(ivCipherB64, 'base64url');
  const iv = ivCipher.subarray(0, IV_BYTES);
  const ciphertext = ivCipher.subarray(IV_BYTES);
  const tag = Buffer.from(tagB64, 'base64url');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
