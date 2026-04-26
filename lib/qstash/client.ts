import { Client, Receiver } from '@upstash/qstash';

// QStash signing keys are paired (current + next) so rotations don't drop
// in-flight messages. The Receiver verifies against both. We accept both the
// `UPSTASH_QSTASH_*` and `QSTASH_*` prefixes — the former matches the
// existing .env.sample convention; the latter matches Upstash's official
// integration on Vercel which auto-injects unprefixed names.
function getSigningKeys(): { current: string; next: string } | null {
  const current =
    process.env.QSTASH_CURRENT_SIGNING_KEY ?? process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY;
  const next =
    process.env.QSTASH_NEXT_SIGNING_KEY ?? process.env.UPSTASH_QSTASH_NEXT_SIGNING_KEY;
  if (!current || !next) return null;
  return { current, next };
}

let cachedClient: Client | null = null;
let cachedReceiver: Receiver | null = null;

// Returns a publishing client. Throws if QSTASH_TOKEN is missing — callers
// should treat that as a fatal misconfig at runtime, not a soft fallback.
export function getQStashClient(): Client {
  if (cachedClient) return cachedClient;
  const token = process.env.QSTASH_TOKEN ?? process.env.UPSTASH_QSTASH_TOKEN;
  if (!token) {
    throw new Error(
      'QSTASH_TOKEN (or UPSTASH_QSTASH_TOKEN) is required for outbound webhook delivery and session scheduling. Set it in Vercel project settings.',
    );
  }
  cachedClient = new Client({ token });
  return cachedClient;
}

// Returns a Receiver for signature verification on QStash callbacks.
// Returns null when keys are absent — callers (route handlers) MUST treat
// null as "fail closed" and refuse the request, not as "skip verification."
export function getQStashReceiver(): Receiver | null {
  if (cachedReceiver) return cachedReceiver;
  const keys = getSigningKeys();
  if (!keys) return null;
  cachedReceiver = new Receiver({
    currentSigningKey: keys.current,
    nextSigningKey: keys.next,
  });
  return cachedReceiver;
}

// Verifies a request signed by QStash. Reads the `Upstash-Signature` header
// and validates against the raw body. Returns false on missing header,
// missing keys, or invalid signature — never throws on bad input.
export async function verifyQStashRequest(
  signature: string | null,
  rawBody: string,
): Promise<boolean> {
  if (!signature) return false;
  const receiver = getQStashReceiver();
  if (!receiver) return false;
  try {
    return await receiver.verify({ signature, body: rawBody });
  } catch {
    return false;
  }
}

// Production-side adapter implementing the QStashPublisher interface used
// by lib/api/ecosystemWebhookDispatcher.ts. Pins `retries: 0` so the
// dispatcher (not QStash) owns retry policy — this lets us update the
// WebhookDelivery row between attempts.
export const qstashPublisher = {
  async publishJSON(args: {
    url: string;
    body: { deliveryId: string };
    delay?: number;
  }): Promise<{ messageId: string }> {
    const client = getQStashClient();
    const result = await client.publishJSON({
      url: args.url,
      body: args.body,
      delay: args.delay,
      retries: 0,
    });
    // publishJSON returns either a single response or an array depending on
    // whether the URL was a destination or a URL group. Our dispatcher always
    // publishes to a single URL, so we narrow.
    if (Array.isArray(result)) {
      throw new Error('QStash publishJSON returned an array; expected single response.');
    }
    return { messageId: result.messageId };
  },
};

// Best-effort QStash message cancellation. Used by cascade-delete to drop
// scheduled work when the underlying child/session is purged. Errors are
// swallowed because orphaned messages no-op on the callback side (the target
// row is gone, the handler returns early).
export async function cancelQStashMessage(messageId: string): Promise<void> {
  try {
    const client = getQStashClient();
    await client.messages.delete(messageId);
  } catch {
    // best-effort — failure is non-fatal.
  }
}

// Test-only reset for caches. Production code never calls this.
export function _resetQStashClientsForTests(): void {
  cachedClient = null;
  cachedReceiver = null;
}
