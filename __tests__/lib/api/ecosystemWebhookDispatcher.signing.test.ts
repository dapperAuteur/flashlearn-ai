/**
 * @jest-environment node
 */
import { createHmac } from 'crypto';
import {
  signPayload,
  buildSignedDelivery,
  nextRetryDelaySeconds,
} from '@/lib/api/ecosystemWebhookDispatcher';
import { MAX_DELIVERY_ATTEMPTS, RETRY_BACKOFF_SECONDS } from '@/lib/api/webhookConstants';

describe('signPayload', () => {
  it('produces sha256=<hex> matching a fresh HMAC-SHA256 over the raw body', () => {
    const body = JSON.stringify({ a: 1, b: 'two' });
    const secret = 'whsec_test';
    const got = signPayload(body, secret);
    const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    expect(got).toBe(expected);
  });

  it('is deterministic across calls (same body + secret → same signature)', () => {
    const body = '{"x":42}';
    const a = signPayload(body, 'k');
    const b = signPayload(body, 'k');
    expect(a).toBe(b);
  });

  it('changes when a single byte of the body changes', () => {
    const a = signPayload('{"x":1}', 'k');
    const b = signPayload('{"x":2}', 'k');
    expect(a).not.toBe(b);
  });

  it('changes when the secret changes', () => {
    const a = signPayload('body', 'k1');
    const b = signPayload('body', 'k2');
    expect(a).not.toBe(b);
  });
});

describe('buildSignedDelivery', () => {
  it('produces signature stable for the rawBody it returns', () => {
    const sd = buildSignedDelivery({ hello: 'world' }, 'secret');
    expect(sd.signature).toBe(signPayload(sd.rawBody, 'secret'));
  });

  it('reuses a provided deliveryId rather than generating a fresh one', () => {
    const sd = buildSignedDelivery({}, 'k', 'fixed-uuid');
    expect(sd.deliveryId).toBe('fixed-uuid');
  });

  it('generates a UUID when deliveryId is omitted', () => {
    const sd = buildSignedDelivery({}, 'k');
    expect(sd.deliveryId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('timestamp is unix seconds (10-digit number around now)', () => {
    const before = Math.floor(Date.now() / 1000);
    const sd = buildSignedDelivery({}, 'k');
    const after = Math.floor(Date.now() / 1000);
    expect(sd.timestamp).toBeGreaterThanOrEqual(before);
    expect(sd.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('nextRetryDelaySeconds backoff schedule', () => {
  it('returns the documented 1m / 5m / 30m / 2h / 6h / 16h ladder', () => {
    expect(nextRetryDelaySeconds(1)).toBe(60);
    expect(nextRetryDelaySeconds(2)).toBe(300);
    expect(nextRetryDelaySeconds(3)).toBe(1800);
    expect(nextRetryDelaySeconds(4)).toBe(7200);
    expect(nextRetryDelaySeconds(5)).toBe(21600);
    expect(nextRetryDelaySeconds(6)).toBe(57600);
  });

  it('returns null after the final attempt (caller dead-letters)', () => {
    expect(nextRetryDelaySeconds(MAX_DELIVERY_ATTEMPTS)).toBeNull();
    expect(nextRetryDelaySeconds(MAX_DELIVERY_ATTEMPTS + 1)).toBeNull();
  });

  it('cumulative retry window is within ~24h36m (matches plan)', () => {
    // sum of all delays between attempts 1→2, 2→3, ..., 6→7
    const total = RETRY_BACKOFF_SECONDS.slice(1).reduce((a, b) => a + b, 0);
    // 60 + 300 + 1800 + 7200 + 21600 + 57600 = 88560 seconds = 24h36m
    expect(total).toBe(60 + 300 + 1800 + 7200 + 21600 + 57600);
    expect(total).toBeGreaterThanOrEqual(24 * 3600);
    expect(total).toBeLessThanOrEqual(25 * 3600);
  });
});
