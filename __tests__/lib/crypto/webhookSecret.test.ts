import {
  encryptWebhookSecret,
  decryptWebhookSecret,
  generateWebhookSecret,
} from '@/lib/crypto/webhookSecret';

const TEST_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('webhookSecret crypto', () => {
  beforeEach(() => {
    process.env.WEBHOOK_ENCRYPTION_KEY = TEST_KEY_HEX;
  });

  afterAll(() => {
    delete process.env.WEBHOOK_ENCRYPTION_KEY;
  });

  it('round-trips arbitrary plaintext', () => {
    const plaintext = 'whsec_some-random-base64url-bytes_here';
    const encrypted = encryptWebhookSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptWebhookSecret(encrypted)).toBe(plaintext);
  });

  it('produces a different ciphertext for the same plaintext (random IV)', () => {
    const a = encryptWebhookSecret('same-secret');
    const b = encryptWebhookSecret('same-secret');
    expect(a).not.toBe(b);
    expect(decryptWebhookSecret(a)).toBe('same-secret');
    expect(decryptWebhookSecret(b)).toBe('same-secret');
  });

  it('detects tampering of the auth tag (GCM authentication)', () => {
    const plaintext = 'cant-tamper-with-me';
    const encrypted = encryptWebhookSecret(plaintext);
    const [version, ivCipher, tag] = encrypted.split(':');
    // Flip the last byte of the auth tag.
    const tagBuf = Buffer.from(tag, 'base64url');
    tagBuf[tagBuf.length - 1] ^= 0xff;
    const tampered = [version, ivCipher, tagBuf.toString('base64url')].join(':');
    expect(() => decryptWebhookSecret(tampered)).toThrow();
  });

  it('rejects unsupported version prefix', () => {
    expect(() => decryptWebhookSecret('v999:abc:def')).toThrow(/version/i);
  });

  it('rejects malformed payloads', () => {
    expect(() => decryptWebhookSecret('v1:onlyonepart')).toThrow(/Malformed/);
  });

  it('throws if WEBHOOK_ENCRYPTION_KEY is missing', () => {
    delete process.env.WEBHOOK_ENCRYPTION_KEY;
    expect(() => encryptWebhookSecret('x')).toThrow(/WEBHOOK_ENCRYPTION_KEY/);
  });

  it('throws if WEBHOOK_ENCRYPTION_KEY decodes to wrong byte length', () => {
    process.env.WEBHOOK_ENCRYPTION_KEY = 'tooshort';
    expect(() => encryptWebhookSecret('x')).toThrow(/32 bytes/);
  });

  it('generateWebhookSecret produces unique high-entropy values with whsec_ prefix', () => {
    const a = generateWebhookSecret();
    const b = generateWebhookSecret();
    expect(a).toMatch(/^whsec_/);
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(40);
  });

  it('accepts the encryption key as base64 (44-char) as well as hex (64-char)', () => {
    process.env.WEBHOOK_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    const ct = encryptWebhookSecret('hello');
    expect(decryptWebhookSecret(ct)).toBe('hello');
  });
});
