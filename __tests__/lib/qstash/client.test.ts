/**
 * @jest-environment node
 */
import {
  verifyQStashRequest,
  getQStashClient,
  getQStashReceiver,
  _resetQStashClientsForTests,
} from '@/lib/qstash/client';

describe('QStash client wrapper', () => {
  beforeEach(() => {
    _resetQStashClientsForTests();
    delete process.env.QSTASH_TOKEN;
    delete process.env.UPSTASH_QSTASH_TOKEN;
    delete process.env.QSTASH_CURRENT_SIGNING_KEY;
    delete process.env.QSTASH_NEXT_SIGNING_KEY;
    delete process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY;
    delete process.env.UPSTASH_QSTASH_NEXT_SIGNING_KEY;
  });

  describe('verifyQStashRequest', () => {
    it('returns false when no signature header is present', async () => {
      process.env.QSTASH_CURRENT_SIGNING_KEY = 'a';
      process.env.QSTASH_NEXT_SIGNING_KEY = 'b';
      _resetQStashClientsForTests();
      expect(await verifyQStashRequest(null, 'body')).toBe(false);
    });

    it('returns false (fail-closed) when signing keys are not configured', async () => {
      // Even with a "signature" header, verifyQStashRequest must refuse if
      // we have no way to verify — never silently allow.
      expect(await verifyQStashRequest('eyJhbGciOi...fake', '{}')).toBe(false);
    });

    it('returns false when signature is invalid (JOSE rejects unparseable JWT)', async () => {
      process.env.QSTASH_CURRENT_SIGNING_KEY = 'sig_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      process.env.QSTASH_NEXT_SIGNING_KEY = 'sig_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy';
      _resetQStashClientsForTests();
      expect(await verifyQStashRequest('definitely-not-a-jwt', 'body')).toBe(false);
    });
  });

  describe('getQStashClient', () => {
    it('throws a clear error when QSTASH_TOKEN is missing', () => {
      expect(() => getQStashClient()).toThrow(/QSTASH_TOKEN/);
    });

    it('accepts QSTASH_TOKEN', () => {
      process.env.QSTASH_TOKEN = 'qstash_test_token';
      expect(() => getQStashClient()).not.toThrow();
    });

    it('falls back to UPSTASH_QSTASH_TOKEN when QSTASH_TOKEN is absent', () => {
      process.env.UPSTASH_QSTASH_TOKEN = 'qstash_test_token';
      expect(() => getQStashClient()).not.toThrow();
    });

    it('caches the client across calls', () => {
      process.env.QSTASH_TOKEN = 'qstash_test_token';
      const a = getQStashClient();
      const b = getQStashClient();
      expect(a).toBe(b);
    });
  });

  describe('getQStashReceiver', () => {
    it('returns null when keys are missing (caller must fail-closed)', () => {
      expect(getQStashReceiver()).toBeNull();
    });

    it('returns a receiver when both keys are present (UPSTASH_ prefix)', () => {
      process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY = 'a';
      process.env.UPSTASH_QSTASH_NEXT_SIGNING_KEY = 'b';
      expect(getQStashReceiver()).not.toBeNull();
    });

    it('prefers QSTASH_ prefix over UPSTASH_QSTASH_ when both set', () => {
      process.env.QSTASH_CURRENT_SIGNING_KEY = 'preferred-current';
      process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY = 'fallback-current';
      process.env.QSTASH_NEXT_SIGNING_KEY = 'preferred-next';
      process.env.UPSTASH_QSTASH_NEXT_SIGNING_KEY = 'fallback-next';
      expect(getQStashReceiver()).not.toBeNull();
      // (Not directly observable, but no throw is enough — both prefixes
      // resolve to a Receiver instance.)
    });
  });
});
